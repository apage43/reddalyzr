(ns reddalyzr.loader
  (:require [clojurewerkz.spyglass.client :as spyc]
            [cheshire.core :as json]
            [reddalyzr.reddit :as reddit]))

(defn load-reddit
  "Load items from a reddit listing into a memcached or Couchbase server"
  [conn subreddit & [limit opts]]
  (let [listing (reddit/listing subreddit opts)]
    (doseq [link (if (nil? limit) listing (take limit listing))]
      (.set conn (:id link) 0 (json/encode link)))))

(defn dev-conn [] (spyc/bin-connection "127.0.0.1:12001"))
