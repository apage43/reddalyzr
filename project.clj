(defproject reddalyzr "0.2.0-SNAPSHOT"
  :description "reddit stuff for clojure"
  :url "http://github.com/apage43/reddalyzr"
  :license {:name "WTFPL"
            :url "http://sam.zoy.org/wtfpl/"}
  :main reddalyzr.startup
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [apage43/cbdrawer "0.2.1"]
                 [com.taoensso/timbre "1.6.0"]
                 [overtone/at-at "1.1.1"]
                 [org.clojure/tools.nrepl "0.2.2"]
                 [clj-http "0.7.2"]])
