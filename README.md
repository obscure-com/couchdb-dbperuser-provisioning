# User Account and Database Provisioning for CouchDB

Many developers choose to store user-specific data in [CouchDB](http://couchdb.apache.org/)
by creating a separate database for each user.  This approach can provide better security and
[performance](http://couchdb-development.1959287.n2.nabble.com/One-big-CouchDB-with-a-lot-of-documents-vs-a-lot-of-CouchDB-databases-with-fewer-documents-td6229205.html)
than storing all user data in a single, monolithic database.  The main obstacle to setting
up per-user databases, however, is the lack of a built-in method for provisioning user accounts
and dbs and setting up security so a user's database is private.  This repo contains a CouchDB
[OS daemon](http://couchdb.readthedocs.org/en/latest/config/externals.html)
that can be used to provision per-user databases for most use cases.

### How it works

A client app makes an HTTP request to the provisioning daemon with a desired username and password.
The daemon performs the following steps and returns information about the created user and database.

1. Generates a unique database name based on the username and (optionally) a configurable
   namespace string.
1. Adds a document to the [`_users`]() database for the new user containing the database name as
   a custom property.
1. Sets the [`_security`](http://couchdb.readthedocs.org/en/latest/api/database/security.html)
   document for the new database so the user can administrate their db.
1. Adds a [`validate document update function`](http://couchdb.readthedocs.org/en/latest/couchapp/ddocs.html#validate-document-update-functions)
   that restricts document updates to the database owner.
1. Returns a JSON document containing the new user's entry in the `_users` database (minus the
   password) and the generated database name.

## Requirements

* Apache CouchDB 1.4 or later
* node 0.10 or later plus npm
* shell access to your CouchDB server

## Installation

1. `git clone https://github.com/pegli/couchdb-dbperuser-provisioning.git`
1. `cd couchdb-peruser-provisioning`
1. `npm install -g`


## Configuration

The provisioning OS daemon uses CouchDB's configuration system.  The easiest way to
set up the daemon is to create an ini file in `/etc/couchdb/local.d` with the following
contents:

    [myapp_provisioning]
    admin_username = admin
    admin_password = admin
    namespace = com.example.myapp
    port = 8100
    
    [os_daemons]
    myapp_provision_daemon = /usr/bin/node /usr/bin/couchdb-provision myapp_provisioning
    
    [httpd_global_handlers]
    _myapp_provision = {couch_httpd_proxy, handle_proxy_req, <<"http://127.0.0.1:8100">>}

When the daemon starts up, it will query CouchDB for the configuration section provided
as the first argument after the script name in the `os_daemons` section.  You may need to
change the path to the node executable and the couchdb-provision script depending on your
system settings (for example, on OSX, the paths are under `/usr/local/bin`).

### Reference

`admin_username` (string) - the name of the admin user to use to create new databases and
users.

`admin_password` (string) - the password of the admin user.

`port` - (number) - the port on which to start the configuration daemon.

`namespace` (string) - a key that represents the application for which the user is being
provisioned.  Application-specific data, including the user's generated database name, will be
stored in the user document under this key.

`add_namespace_to_dbname` (boolean) - if true, generated database names will include the
namespace string.
  
### References

* [Matt Woodward's Blog: The Definitive Guide to CouchDB Authentication and Security](http://blog.mattwoodward.com/2012/03/definitive-guide-to-couchdb.html)

