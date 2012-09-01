(defproject reddalyzr "0.1.0-SNAPSHOT"
  :description "reddit stuff for clojure"
  :url "http://github.com/apage43/reddalyzr"
  :license {:name "WTFPL"
            :url "http://sam.zoy.org/wtfpl/"}
  :main ^{:skip-aot true} reddalyzr.startup
  :dependencies [[org.clojure/clojure "1.4.0"]
                 [clojurewerkz/spyglass "1.1.0-SNAPSHOT"]
                 [com.taoensso/timbre "0.8.0"]
                 [org.clojure/tools.nrepl "0.2.0-beta9"]
                 [cheshire "4.0.1"]
                 [overtone/at-at "1.0.0"]
                 [apage43/grab-bag "0.1.0-SNAPSHOT"]
                 [clj-http "0.5.3"]])
