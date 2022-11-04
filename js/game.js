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
}
game();