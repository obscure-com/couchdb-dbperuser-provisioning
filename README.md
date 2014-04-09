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
1. `npm update`
1. `cd config` and `cp local.yaml.example local.yaml`.  Edit `local.yaml` to set your
   admin username and password and the name of the daemon's config section in CouchDB.

TODO describe how to add the OS daemon to the CouchDB config
TODO describe the daemon config (namespace, etc.)

## Configuration

The provisioning daemon uses [node-config](http://lorenwest.github.io/node-config/latest/)
for configuration.  For a quick start, copy `config/local.yaml.example` to `config/local.yaml`
and change the values as needed for your CouchDB installation.

`username` (string) - the name of the admin user to use to create new databases and
users.

`password` (string) - the password of the admin user.

`host` (string) - the CouchDB host (default is "localhost")

`port` (number) - the CouchDB port (default is 5984)

`userdb` (string) - the name of the users database (default is "_users")

`config_section` (string) - the title of the configuration section in the CouchDB config
where this instance of the OS daemon will get its port and namespace values.

`add_namespace_to_dbname` (boolean) - if true, generated database names will include the
namespace string.
  
### References

* [Matt Woodward's Blog: The Definitive Guide to CouchDB Authentication and Security](http://blog.mattwoodward.com/2012/03/definitive-guide-to-couchdb.html)

