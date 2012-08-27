# reddalyzr

Some tools to pull data from reddit, and do stuff with it, like loading it into
[Couchbase Server](http://www.couchbase.com).

    lein repl

```clojure
startup=> (require '[reddalyzr.reddit :as reddit])
; Get the top 50 subreddits
startup=> (take 50 (map :display_name (reddit/listing "reddits/popular")))
("pics" "funny" "politics" "gaming" "AskReddit" "worldnews" "videos" "IAmA" "todayilearned" "WTF" "aww" "atheism" "technology" "science" "Music" "movies" "bestof" "fffffffuuuuuuuuuuuu" "trees" "Minecraft" "gifs" "pokemon" "4chan" "circlejerk" "starcraft" "Guildwars2" "facepalm" "tf2" "news" "doctorwho" "TwoXChromosomes" "Jokes" "cats" "soccer" "woahdude" "batman" "Android" "space" "cars" "harrypotter" "Games" "nfl" "community" "guns" "zelda" "comics" "FoodPorn" "conspiracy" "Fallout" "Diablo")
```

## Using the reddit data grabber

Set some environment variables before starting it up:

    export COUCHBASE_BUCKET=default
    export COUCHBASE_URI="http://my-cluster:8091/pools/"
    lein run

Check out the [source](http://apage43.github.com/reddalyzr/uberdoc.html).
