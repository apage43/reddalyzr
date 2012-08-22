# reddalyzr

Some tools to pull data from reddit, and do stuff with it, like loading it into
[Couchbase Server](http://www.couchbase.com).

    lein repl

```clojure
user=> (require 'loader '[clojurewerkz.spyglass.client :as cli])
user=> (def conn (cli/bin-connection "couchbaseserver:11211"))
user=> (loader/load-reddit conn "r/all")
```

Check out the [source](http://apage43.github.com/reddalyzr/uberdoc.html).
