(ns reddalyzr.grabulator
  (:use [overtone.at-at :only (at now)])
  (:require [reddalyzr.reddit :as reddit]
            [reddalyzr.loader :as loader]
            [overtone.at-at :as at-]
            [taoensso.timbre :as log]
            [cheshire.core :as json]
            [clojurewerkz.spyglass.client :as cb]
            [clj-http.client :as http]))

(def aapool (at-/mk-pool))

(def cb-rest-addr (get (System/getenv) "COUCHBASE_REST" "http://127.0.0.1:9500/default/_design/reddit/"))
(def cb-mc-addr (get (System/getenv) "COUCHBASE_MEMCACHED" "127.0.0.1:12001"))
(def statekey "reddalyzr_grabulator_state")

(def grabulator-config (atom {}))
(def persisted-state (agent {}))
(def initial-state {:kind :configuration
                    :scheduled-tasks {}
                    ;; Grab 300 most recent items every minute
                    :periodic {:all-new [60 "grab" ["r/all/new/" 300 {:query-params {:sort "new"}}]]}})

(defn persist-state [_key _atom oldval newval]
  (when (not= oldval newval) (cb/set (:cb-conn @grabulator-config) statekey 0 (json/encode newval))))

(defn grab-task [path limit & [opts]]
  (log/info "Loading from path" (str "\"" path "\"") "limit" limit opts)
  (loader/load-reddit (:cb-conn @grabulator-config) path limit opts))

(def tasks
  {:grab grab-task})

(defn r-munge [path] (.replace path \/ \_))

(defn drop-task [pstate tk]
  (log/info "Task" tk "completed")
  (update-in pstate [:scheduled-tasks] dissoc tk))

(defn prepare-to-fire [pstate]
  (let [mysid (:sid @grabulator-config)]
    (reduce (fn [s [tk t]]
              (if (not= mysid (:sid t))
                (do (at (:time t) #(do (apply (tasks (keyword (:type t))) (:parm t))
                                       (send persisted-state drop-task tk))
                        aapool)
                    (log/info "Scheduled task" tk "to fire at" (:time t))
                    (assoc-in s [:scheduled-tasks tk :sid] mysid))
                s)) pstate (:scheduled-tasks pstate))))

(defn sched-task [pstate id [time type parm]]
  (let [prex ((:scheduled-tasks pstate) id)
        ntime (+ (* 1000 time) (now))]
    (send persisted-state prepare-to-fire)
    (if (nil? prex)
      (assoc-in pstate [:scheduled-tasks id] {:time ntime :type type :parm parm})
      pstate)))

(defn grab-path [rdt & [limit opts]]
  (send persisted-state sched-task
        (keyword (str "fetch-" (r-munge rdt)))
        [0 "grab" [(str rdt) (or limit 10000) opts]]))

(defn sched-periodic-grab [path period & [limit opts]]
  (send persisted-state assoc-in [:periodic (keyword (str "fetch-" (r-munge path)))]
        [period "grab" [path (or limit 500) opts]]))

(defn heartbeat [pstate]
  (log/debug "Grabulator heartbeat.")
  ;; Reschedule repeating tasks
  (doseq [[tk tv] (:periodic pstate)] (send persisted-state sched-task tk tv))
  ;; Schedule next heartbeat
  (when (:heartbeat @grabulator-config) (at (+ (now) 5000) #(send persisted-state heartbeat) aapool))
  pstate)

(defn startup []
  (reset! grabulator-config {:cb-conn (cb/bin-connection cb-mc-addr)
                             :heartbeat true
                             :sid (now)})
  (let [cfg @grabulator-config
        conn (:cb-conn cfg)
        loadps (json/parse-string (or (cb/get conn statekey) "{}") true)]
    (add-watch persisted-state "persistor" persist-state)
    (if (= loadps {})
      (do (log/warn "No state record found in Couchbase" loadps)
          (send persisted-state (fn [_] initial-state)))
      (send persisted-state (fn [_] loadps)))
      (send persisted-state heartbeat)))

(defn start-file-logging [filename]
  (let [stdoutfn (get-in @log/config [:appenders :standard-out :fn])
        fappender {:doc "Prints to file" :min-level nil :enabled? true :async? false
                   :max-message-per-msecs nil
                   :fn (fn [logdata] (spit filename (with-out-str (stdoutfn logdata)) :append true))}]
    (log/set-config! [:appenders :file-appender] fappender)))

(defn shutdown []
  (swap! grabulator-config dissoc :heartbeat)
  (remove-watch persisted-state "persistor")
  (at-/stop-and-reset-pool! aapool))