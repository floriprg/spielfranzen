function game() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

    let s = params.s;

    let data = "";
    let newdata = "";

    function ajax3() {
        $.ajax({
            method: "POST",
            url: "dbchange_game.php",
            data: {
                s: s
            }

        })
            .done(function (response) {
                data = response;
            });

        setInterval(ajax4, 2000);
    }

    function ajax4() {
        $.ajax({
            method: "POST",
            url: "dbchange_game.php",
            data: {
                s: s
            }
        })

            .done(function (response) {
                newdata = response;
                if ((newdata != data)) {
                    window.location.reload();
                }
            });
    }
    ajax3();
    function sql(sql, type) {
        $.ajax({
            method: "POST",
            url: "sql.php",
            data: {
                sql: sql,
                type: type
            }
        })
            .done(function (response) {
                if (type == "sel") {
                    return response;
                }
            });
    }

    /*
    let s1 = {
        name: "offen",
        punkte: 0,
        karten: neuekarten(),
        s: s
    };
    let s2 = {
        name: "offen",
        punkte: 0,
        karten: neuekarten(),
        s: s
    };
    let s3 = {
        name: "offen",
        punkte: 0,
        karten: neuekarten(),
        s: s
    };
    console.log(s1);
    sql("update spiele set s1 ='" + JSON.stringify(s1) + "' where id = '" + s + "';", "ins");
    sql("update spiele set s2 ='" + JSON.stringify(s2) + "' where id = '" + s + "';", "ins");
    sql("update spiele set s3 ='" + JSON.stringify(s3) + "' where id = '" + s + "';", "ins");
    */
}

game();