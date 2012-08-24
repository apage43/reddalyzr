(ns startup
  (:require [taoensso.timbre :as log]
            [reddalyzr.grabulator :as g])
  (:require [clojure.tools.nrepl.server :as rs]))

(def server (atom nil))

(defn -main []
  (let [replport (Integer/parseInt (get (System/getenv) "REPL_PORT" "0"))]
    (log/set-level! :info)
    (when (not= 0 replport)
      (log/info "Start REPL Server" @(reset! server (rs/start-server :port replport))))
    (g/startup)))
