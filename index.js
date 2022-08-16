let spieleichel = {
    nummer: 5,
    trumpf: eich,
    punkte: 100
}
let spiellaub = {
    nummer: 6,
    trumpf: laub,
    punkte: 100
}
let spielschell = {
    nummer: 7,
    trumpf: sche,
    punkte: 100
}
let spielherz = {
    nummer: 8,
    trumpf: herz,
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
        .done(function (response) {
            if (type == "sel") {
                return response;
            }
        });
}

for (let i = 0; i < 10; i++) {
    document.getElementById(i).addEventListener('click', function () {
        sql("update table spiele set ablegkarten");
    })
}

