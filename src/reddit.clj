(ns reddit
  (:require [clj-http.client :as http]
            [clojure.walk :as walk]))

(defn- rdt-transform [el]
  (if (map? el)
    (condp = (:kind el)
        "Listing" (let [data (:data el)
                        items (:children data)
                        m (merge (dissoc el :data) (dissoc data :children) {:kind :listing})]
                    (with-meta items m))
        ;Link
        "t3" (let [data (:data el)
                   m (merge (dissoc el :data) {:kind :link})]
               (with-meta (merge data {:kind :link}) m))
        ;Comment
        "t1" (let [data (:data el)
                   m (merge (dissoc el :data) {:kind :comment})]
               (with-meta (merge data {:kind :comment}) m))
        el)
    el))

(def reddit-base "http://reddit.com")

(def ^:private lrqtime (atom 0))

(defn- rlimit [minwait timeatom]
  (let [oldtime @timeatom
        now (System/currentTimeMillis)
        diff (- now oldtime)]
    (when (> minwait diff)
      (Thread/sleep (- minwait diff)))
    (reset! timeatom (System/currentTimeMillis))))

(defn request
  "Use clj-http to make a request to a reddit resource. Will append .json to get JSON
  data, and rate-limit to one request per two seconds, per reddit API guidelines."
  [& [path opts]]
  (rlimit 2000 lrqtime) ;rate limit, 1 request per 2 seconds per reddit guidelines
  (:body (http/request (merge-with merge
                                   {:method :get
                                    ; descriptive user-agent per reddit guidelines
                                    :headers {"User-Agent" "reddalyzr.clj by /u/apage43"}
                                    :url (str reddit-base "/" path ".json")
                                    :as :json} opts))))

(defn request-xf
  "Request as with request, but also transform the data to something more clojure friendly,
  attaching metadata as clojure metadata."
  [& [path opts]]
  (walk/postwalk rdt-transform (request path opts)))

(defn- listing-seq [path listing]
  (let [m (meta listing)
        after (:after m)]
    (if (not= (:kind m) :listing) (throw (ex-info {:error "Not a listing" :obj listing})))
    (lazy-cat listing
              (if (nil? after) []
                  (listing-seq path (request-xf path {:query-params {:after after :limit 100}}))))))

(defn listing
  "A lazy sequence of all the items that would be on the listing page at path.
  (take 50 (listing \"r/gaming\"))"
  [path]
  (listing-seq path (request-xf path {:query-params {:limit 100}})))

(defn thing [id & [opts]]
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
