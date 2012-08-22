(ns loader
  (:require [clojurewerkz.spyglass.client :as spyc]
            [cheshire.core :as json]
            reddit))

(defn load-reddit
  "Load items from a reddit listing into a memcached or Couchbase server"
  [conn subreddit]
  (doseq [link (reddit/listing subreddit)]
    (.set conn (:id link) 0 (json/encode link))))

(defn dev-conn [] (spyc/bin-connection "127.0.0.1:12001"))
