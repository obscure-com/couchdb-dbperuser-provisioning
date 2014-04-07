#!/usr/bin/node

var http = require('http');
var url = require('url');
var request = require('request');
var sys = require('sys');
var uuid = require('uuid');
var Promise = require('bluebird');

/*
 * Provision a per-user database
 *
 * The daemon does the following:
 *   
 *   1. Creates a new user in the _users database.
 *   2. Generates a database name.
 *   3. Creates the database.
 *   4. Adds a _design/security ddoc with a validate_doc_update function that only
 *      allows the user to read and write the db.
 *   5. Puts the database name into the user's record in the _users db.
 *
 * Returns a 403 if the username already exists or the username or password is missing
 */

var CONFIG = require('config').Provisioning;

var log = function(mesg) {
  console.log(JSON.stringify(["log", mesg]));
}

var do_put = function(url, req, resolve, reject) {
  var options = {
    url: url,
    headers: { 'Content-Type': 'application/json' },
    auth: {
      user: CONFIG.username,
      pass: CONFIG.password
    }
  };
  
  req && (options.body = JSON.stringify(req));
  
  request.put(options, function(error, response, body) {
    if (error) {
      reject(error);
      return;
    }
    
    var b = JSON.parse(response.body);
    if (!b.ok) {
      reject(b);
    }
    else {
      resolve(b);
    }
  });
}

var create_user = function(data) {
  return new Promise(function(resolve, reject) {
    if (!data || !data.username || !data.password) {
      reject({ error: 'missing required parameters' });
      return;
    }
    
    var user = {
      name: data.username,
      password: data.password,
      type: 'user',
      roles: [data.username],
      'com.obscure.padsnpaws': {
        dbname: data.username + '_' + uuid.v4()
      }
    };
    
    do_put(
      'http://' + CONFIG.host + ':' + CONFIG.port + '/_users/org.couchdb.user:' + data.username,
      user,
      function(resp) { resolve(user) },
      reject
    );
  });
}

var create_database = function(user) {
  return new Promise(function(resolve, reject) {
    do_put(
      'http://' + CONFIG.host + ':' + CONFIG.port + '/' + user['com.obscure.padsnpaws'].dbname + '/',
      null,
      function(resp) { resolve(user) },
      reject
    );
  });
};

var add_security_doc = function(user) {
  return new Promise(function(resolve, reject) {
    do_put(
      'http://' + CONFIG.host + ':' + CONFIG.port + '/' + user['com.obscure.padsnpaws'].dbname + '/_security',
      {
        members: {
          users: [user.name],
          roles: [user.name]
        },
        admins: {
          users: [user.name],
          roles: []
        }
      }, 
      function(resp) { resolve(user) },
      reject
    );
  });
};

var add_doc_update_ddoc = function(user) {
  return new Promise(function(resolve, reject) {
    var ddoc = {
      validate_doc_update: "function(new_doc, old_doc, userCtx) { if (userCtx.roles.indexOf('"+user.name+"') == -1) { throw({forbidden: 'Not Authorized'}); } }"
    };
    
    do_put(
      'http://' + CONFIG.host + ':' + CONFIG.port + '/' + user['com.obscure.padsnpaws'].dbname + '/_design/security',
      ddoc, 
      function(resp) { resolve(user) },
      reject
    );
  });
}


// HTTP server

var server = http.createServer(function(req, resp) {
  var query = url.parse(req.url, true).query;
  var data = {
    username: query.username,
    password: query.password
  };

  create_user(data)
    .then(create_database)
    .then(add_security_doc)
    .then(add_doc_update_ddoc)
    .then(function(d) {
      resp.writeHead(200, { 'Content-Type': 'application/json' });
      resp.end(JSON.stringify(d));
      log('provisioned user: '+d.name+', db '+d['com.obscure.padsnpaws'].dbname);
    })
    .catch(function(err) {
      resp.writeHead(403, { 'Content-Type': 'application/json' });
      resp.end(JSON.stringify(err));
      log('error provisioning user: '+JSON.stringify(err));
    });
  
});

// OS daemon stdin listener

var stdin = process.openStdin();

stdin.on('data', function(d) {
  // d will be the response from console.log below
  server.listen(parseInt(JSON.parse(d)));
});

stdin.on('end', function () {
  process.exit(0);
});

// ask for our port
console.log(JSON.stringify(['get', 'user_database_provisioning', 'port']));
