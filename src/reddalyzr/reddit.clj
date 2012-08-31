;; # Reddit API Utilities
(ns reddalyzr.reddit
  (:require [clj-http.client :as http]
            [grab-bag.time :as tg]
            [taoensso.timbre :as log]
            [clojure.walk :as walk]))

;; Reddit will always give us what the reddit docs refer to as a "thing".
;; Types of things are documented [here](https://github.com/reddit/reddit/wiki/thing)
;;
;; We'll handle a couple types of things and transform them to be more easily used by
;; all the clojure data processing tools. The "Listing" type for example, would be more
;; useful if it was just a list of the items it contained. We use clojure metadata to attach
;; the original metadata so we can still get to it later.
(letfn [(remap-kind [el kind]
          (let [data (:data el)
                m (merge (dissoc el :data) {:kind kind})]
            (with-meta (merge data {:kind kind}) m)))]
  (defn- rdt-transform [el]
    (if (map? el)
      (condp = (:kind el)
        "Listing" (let [data (:data el)
                        items (:children data)
                        m (merge (dissoc el :data) (dissoc data :children) {:kind :listing})]
                    (with-meta items m))
        "more" (let [data (:data el)
                     items (:children data)
                     m (merge (dissoc el :data) (dissoc data :children) {:kind :more})]
                 (with-meta items m))
        "t3" (remap-kind el :link)
        "t1" (remap-kind el :comment)
        "t5" (remap-kind el :subreddit)
        el)
      el)))

(def reddit-base "http://reddit.com")

(defn- raw-request
  [& [path opts]]
  (:body (http/request (merge-with merge
                                   {:method :get
                                    ; descriptive user-agent per reddit guidelines
                                    :headers {"User-Agent" "reddalyzr.clj by /u/apage43"}
                                    :url (str reddit-base "/" path ".json")
                                    :as :json} opts))))

(let [rrmeta (meta #'raw-request)]
  (def ^{:arglists (:arglists rrmeta) :doc
 "Use clj-http to make a request to a reddit resource. Will append .json to get JSON
  data, and rate-limit to one request per two seconds, per reddit API guidelines."}
    request (tg/rate-limited 2000 raw-request)))

(defn request-xf
  "Request as with request, but also transform the `thing`s to something more clojure friendly,
  attaching metadata as clojure metadata."
  [& [path opts]]
  (walk/postwalk rdt-transform (request path opts)))

;; Given a listing and the path that was used to retrieve it, create a lazy sequence
;; that will request the next page of items, if there is another page after the current one.
(defn- listing-seq [path listing opts]
  (let [m (meta listing)
        after (:after m)]
    (if (not= (:kind m) :listing) (throw (ex-info "Not a listing" {:obj listing})))
    (lazy-cat listing
              (if (nil? after) []
                  (listing-seq path (request-xf path (merge-with merge {:query-params {:after after :limit 100}} opts)) opts)))))

(defn listing
  "A lazy sequence of all the items that would be on the listing page at path.
  `(take 50 (listing \"r/gaming\"))`"
  [path & [opts]]
  (listing-seq path (request-xf path (merge-with merge {:query-params {:limit 100}} opts)) opts))

(defn thing
  "Get a `thing` by its id"
  [id & [opts]]
  (request-xf (str "by_id/" id) opts))

(defn hour-freqs [listing-path amount]
  (frequencies
   (map (fn [x] (-> x
                    :created_utc
                    long
                    (* 1000)
                    (java.util.Date.)
                    .getHours)) (take amount (listing listing-path)))))

(defn print-hour-freqs [hh]
  (let [mv (apply max (vals hh))]
    (doseq [[k v] (sort hh)]
      (println (str (if (> 10 k) " " "") k " " (apply str (repeat (* (/ 30 mv) v) "*")))))))

