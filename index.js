function game() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

    let s = params.s;
    let spieleichel = {
        nummer: 5,
        trumpf: "eich",
        punkte: 100
    }
    let spiellaub = {
        nummer: 6,
        trumpf: "laub",
        punkte: 100
    }
    let spielschell = {
        nummer: 7,
        trumpf: "sche",
        punkte: 100
    }
    let spielherz = {
        nummer: 8,
        trumpf: "herz",
        punkte: 100
    }
    let bettl = {
        nummer: 9,
        punkte: 200
    }
    let mord = {
        nummer: 10,
        punkte: 300
    }
    let doppelbettl = {
        nummer: 11,
        punkte: 400
    }
    let doppelmord = {
        nummer: 12,
        punkte: 600
    }

    function sql(sql, type) {
        $.ajax({
            method: "POST",
            url: "sql.php",
            data: {
                sql: sql,
                type: type
            }
        })
    }

    for (let j = 0; j < 10; j++) {
        try {
            document.getElementById(j).addEventListener('click', function () {
                try {
                    karteentfernen(document.getElementById(j).getAttribute('src'));
                } catch (error) {

                }
            })
        } catch (error) {

        }
    }
    function karteentfernen(karte) {
        $.ajax({
            method: "POST",
            url: "sql.php",
            data: {
                to_del: karte,
                s: s,
                type: "del"
            }
        })
            .done(function (response) {
                alert(response);
                window.location.reload();
            });

    }

}

game();