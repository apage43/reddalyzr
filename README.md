# reddalyzr

Some tools to pull data from reddit, and do stuff with it, like loading it into
[Couchbase Server](http://www.couchbase.com).

    lein repl

```clojure
; Get the name, title, and number of active accounts for the top 10 subreddits
reddalyzr.startup=> (map (juxt :display_name :title :accounts_active) (take 10 (reddit/listing "reddits/popular")))
(["pics" "/r/Pics" 14538] ["funny" "funny" 17086] ["politics" "Politics" 3860] ["gaming" "gaming.reddit: what's new in gaming" 10674] ["AskReddit" "Ask Reddit..." 17818] ["worldnews" "World News [ no US / US Politics news please ]" 1578] ["videos" "Videos" 4491] ["IAmA" "I Am A, where the mundane becomes fascinating and the outrageous suddenly seems normal." 10132] ["todayilearned" "Today I Learned (TIL)" 3530] ["WTF" "WTF?!" 8164])
```

## Using the reddit data grabber

Set some environment variables before starting it up:

    export COUCHBASE_BUCKET=default
    export COUCHBASE_URI="http://my-cluster:8091/pools/"
    lein run

Check out the [source](http://apage43.github.com/reddalyzr/uberdoc.html).
