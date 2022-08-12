let data = "";
let newdata = "";

function ajax3() {
    $.ajax({
        method: "POST",
        url: "dbchange.php"

    })
        .done(async function (response) {
            data = response;
        });

    setInterval(ajax4, 1000);
}

function ajax4() {
    $.ajax({
        method: "POST",
        url: "dbchange.php"
    })

        .done(function (response) {
            newdata = response;
            if (!(newdata == data)) {
                window.location.reload();
            }
        });
}
ajax3();