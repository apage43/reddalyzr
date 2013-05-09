(ns reddalyzr.loader
  (:require [cbdrawer.client :as cb]
            [reddalyzr.reddit :as reddit]))

(defn load-reddit
  "Load items from a reddit listing into a memcached or Couchbase server"
  [conn subreddit & [limit opts]]
  (let [listing (reddit/listing subreddit opts)]
    (doseq [link (if (nil? limit) listing (take limit listing))]
      (cb/force! conn (:id link) link))))
