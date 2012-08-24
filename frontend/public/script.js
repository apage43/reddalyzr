var h = $("#chart").height() - 30,
    w = $("#chart").width() + 3;

var toppad = 25;

var UTCOffset = new Date().getTimezoneOffset() / 60;
var HourShift = -UTCOffset;

var chartsvg = d3.select("#chart")
               .append("svg")
               .attr("width", w)
               .attr("height", h + 30);

var last_data = undefined;

var colors = colorbrewer.RdYlBu[9];
colors.reverse();

var hrax = d3.svg.axis()
    .scale(d3.scale.linear().range([0, w - 3]).domain([0,24]))
    .tickValues([1, 6, 11, 17, 22])
    .tickFormat(function(t) {
        var end = "am";
        if(t >= 12) { t-=12; end = "pm"; }
        return t + end;
    }).orient("bottom");

var axg = chartsvg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + h + ")")
    .call(hrax);

var legend = chartsvg.append("g");

legend.append("rect")
      .attr("width", 305)
      .attr("height", 20)
      .attr("rx", 10)
      .attr("ry", 10)
      .style("fill", "#444");

legend.attr("class", "legend")
      .attr("transform", "translate(0, 0)")
      .selectAll("rect").data(colors)
      .enter().append("rect")
          .style("fill", function(d) { return d3.rgb(d).darker(0.25).toString(); })
          .attr("x", function(d,i) { return 190 + i * 12 })
          .attr("y", 5)
          .attr("width", 10)
          .attr("height", 10);


legend.append("text")
      .attr("x", 10)
      .attr("y", 15)
      .text("Karma score, low to high:")
      .style("fill", "#fff");

function show_freqs(row, dur) {
    last_data = row;
    if(!row) {
        row = { value: { freqs: [], score: [] }}
    }

    $("#dpnbr").html(_.reduce(row.value.freqs,
                     function(acc, n) { return acc + n}, 0));

    //Loop the data around a bit so we can slide it
    //to do the timezone transition animation
    var ringed = _.last(row.value.freqs, 12)
                 .concat(row.value.freqs)
                 .concat(_.first(row.value.freqs, 12));

    var freqdata = _.map(ringed, function(d, i) {
        var u = Math.abs(i - 12);
        return {posts: d, utchour: u % 24, disphour: (i - 12) + HourShift};
    });
    var maxscore = _.max(row.value.score);
    var minscore = _.min(row.value.score);
    var domain = [0, _.max(row.value.freqs)];
    var scorescale = d3.scale.quantile()
                        .domain([maxscore, minscore])
                        .range(colors);
    var scale = d3.scale.linear().range([0, h - toppad]).domain(domain).nice();

    var bars = chartsvg.selectAll(".bar").data(freqdata);

    function updatebar(el) {
        return el.attr("width", (w/24) - 3)
                 .attr("x", function(d) {
                     return d.disphour * (w/24);
                 })
                 .attr("y", function(d) { return h - scale(d.posts); } )
                 .attr("class", "bar")
                 .style("fill", function(d) {
                     var scaled = scorescale(row.value.score[d.utchour]);
                     return d3.rgb(scaled).darker(0.25).toString();
                 })
                 .transition()
                 .duration(dur)
                 .attr("height", function(d) { return scale(d.posts); });
    }

    updatebar(bars.enter().append("rect"));
    updatebar(bars.transition().duration(dur));
    bars.exit().remove();
}

function showrdt(reddit, st, en) {
    var viewquery = { stale: "update_after" };

    if(reddit != 'all') {
        viewquery.startkey = JSON.stringify([reddit, st]);
        viewquery.endkey = JSON.stringify([reddit, en, {}]);
    }

    $("#rname").html("r/" + reddit);

    $.ajax("/api/posthours", {
        dataType: "json",
        data: viewquery,
        success: function (data, e) {
            if(data) {
                show_freqs(data.rows[0], 500);
            }
        }
    });
}

var routes = {
    '/:reddit/:start/:end': function(rdt, st, en) {
        $("#reddits .selected").removeClass("selected");
        $("#r-" + rdt).addClass("selected");
        showrdt(rdt, parseInt(st), parseInt(en));
    },
    '/all': function() {
        $("#reddits .selected").removeClass("selected");
        $("#r-all").addClass("selected");
        showrdt('all');
    },
}

var router = Router(routes);

$.ajax("/api/subrcount", {
    data: { group_level: 1, stale: "update_after" },
    dataType: "json",
    success: function (data, e) {
        if(data) {
            $("#reddits ul").html();
            $("#reddits ul").append(
                "<li><span><a id='r-all' href='#/all'>all reddits</a></span></li>");
            var reddits = _.sortBy(_.filter(data.rows,function(r) { return r.value >= 20 }), function(r) { return -r.value; });
            _.each(reddits, function(r, i) {
                $("#reddits ul").append(
                    "<li><span><a id='r-" + r.key[0] +
                    "' href='#/" + r.key[0] + "/0/6'>" + r.key[0] +
                    "</a> (" + r.value + ")</span></li>");
            });
            router.init('/all');
        }
    }
});

$("#tzctl a").click(function() {
    var tz = $(this).text();
    $("#tzctl .selected").removeClass("selected");
    $(this).addClass("selected");
    if(tz == 'UTC') {
        HourShift = 0;
    } else {
        HourShift = -UTCOffset;
    }
    if(last_data) {
        show_freqs(last_data, 500);
    }
});

function doresize() {
    var dw = $(window).width();
    var cw;
    if(dw <= 990) {
        cw = dw - 80;
    } else {
        cw = dw - 380;
    }

    var ch = $(window).height() - 140;
    $("#content").width(cw)
    $("#content").height(ch)
    $("#chart").width(cw);
    $("#chart").height(ch);
    chartsvg.attr("width", cw);
    chartsvg.attr("height", ch);
    h = ch - 30;
    w = cw + 3;
    hrax.scale(d3.scale.linear().range([0, w - 3]).domain([0,24]))
    axg.attr("transform", "translate(0," + h + ")").call(hrax);
    if(last_data) {
        show_freqs(last_data, 0);
    }
}

$(window).resize(doresize);
$(doresize());


