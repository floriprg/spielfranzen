function game() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

    let s = params.s;
    let to = params.to;
    if (!s || !to) {
        window.location = "index.php";
    }
    let karten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];

    function neuekarten() {
        let zufallskarten = [];
        for (let i = 0; i < 10; i++) {
            let zahl = Math.round(Math.random() * (karten.length - 1));
            zufallskarten.push(karten[zahl]);
            karten.splice(zahl, 1);
        }
        return zufallskarten;
    }

    function sql(sql) {
        $.ajax({
            method: "POST",
            url: "sql.php",
            data: {
                sql: sql
            }
        })
            .done(function (response) {
                //alert(response);
            });
    }
    let s1 = {
        name: "name",
        punkte: 0,
        karten: neuekarten(),
        s: 0
    };
    let s2 = {
        name: "name",
        punkte: 0,
        karten: neuekarten(),
        s: 0
    };
    let s3 = {
        name: "name",
        punkte: 0,
        karten: neuekarten(),
        s: 0
    };
    console.log(JSON.stringify(s1));
    sql("update spiele set s1 ='" + JSON.stringify(s1) + "' where id = '" + s + "';");
    sql("update spiele set s2 ='" + JSON.stringify(s2) + "' where id = '" + s + "';");
    sql("update spiele set s3 ='" + JSON.stringify(s3) + "' where id = '" + s + "';");

}

game();