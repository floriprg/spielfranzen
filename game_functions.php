<?php
function neuekarten()
{
    $karten = array("6laub.jpg", "6sche.jpg", "6eich.jpg", "6herz.jpg", "2laub.jpg", "2sche.jpg", "2eich.jpg", "2herz.jpg", "3laub.jpg", "3sche.jpg", "3eich.jpg", "3herz.jpg", "4laub.jpg", "4sche.jpg", "4eich.jpg", "4herz.jpg", "5eich.jpg", "5herz.jpg", "5laub.jpg", "5sche.jpg", "7eich.jpg", "7herz.jpg", "7laub.jpg", "7sche.jpg", "8eich.jpg", "8herz.jpg", "8laub.jpg", "8sche.jpg", "9eich.jpg", "9herz.jpg", "9laub.jpg", "9sche.jpg", "1sche.jpg");
    $zufallskarten = [];
    for ($i = 0; $i < 33; $i++) {
        $zahl = rand(0, (count($karten) - 1));
        $zufallskarten[] = $karten[$zahl];
        array_splice($karten, $zahl, 1);
    }
    return $zufallskarten;
}


function kartenausteilen($s, $n1, $n2, $n3)
{
    $data = sql("select jetztdran, spielrunde from spiele where id =" . $_GET['s']);
    while ($row = pg_fetch_row($data)) {
        $jetztdran = $row[0];
        $spielrunde = $row[1];
    }

    $data_karten = sql("select ablegkarten[1], ablegkarten[2], ablegkarten[3] from spiele where id = " . $_GET['s']);
    try {
        while ($row = pg_fetch_row($data_karten)) {
            $a_karte1 = $row[0];
            $a_karte2 = $row[1];
            $a_karte3 = $row[2];
        }
    } catch (\Throwable $th) {
        new error($th);
    }
    echo '<div class="container">';
    echo '
<div class="d-flex flex-column justify-content-center">
    <div class="d-flex flex-wrap justify-content-center">
        <div class="d-flex flex-row justify-content-center">
            <div class="card m-2" style="width: 30vw; max-width: 120px">
                <img id="ableg1" class="card-img-top img-fluid" src="karten/' . (($a_karte1 == "keine") ? 'deckblatt.jpg'
        : $a_karte1) . '" alt="Karte 1">
                <div class="card-body">
                    <h5 class="card-title">' . $n1->name . '</h5>
                    <p>' . (($jetztdran == "s1") ? 'jetzt dran' : '') . '</p>
                </div>
            </div>
            <div class="card m-2" style="width: 30vw; max-width: 120px">
                <img id="ableg2" class="card-img-top img-fluid" src="karten/' . (($a_karte2 == "keine") ? 'deckblatt.jpg'
        : $a_karte2) . '" alt="Karte 2">
                <div class="card-body">
                    <h5 class="card-title">' . $n2->name . '</h5>
                    <p>' . (($jetztdran == "s2") ? 'jetzt dran' : '') . '</p>
                </div>
            </div>
            <div class="card m-2" style="width: 30vw; max-width: 120px">
                <img id="ableg3" class="card-img-top img-fluid" src="karten/' . (($a_karte3 == "keine") ? 'deckblatt.jpg'
        : $a_karte3) . '" alt="Karte 3">
                <div class="card-body">
                    <h5 class="card-title">' . $n3->name . '</h5>
                    <p>' . (($jetztdran == "s3") ? 'jetzt dran' : '') . '</p>
                </div>
            </div>
        </div>
        <p>
            <button class="btn btn-primary" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExample"
                aria-expanded="false" aria-controls="collapseExample">
                Punktetabelle
            </button>
        </p>
        <div class="collapse" id="collapseExample">
            <div class="card card-body">
                <table class="table w-25">
                    <thead>
                        <tr>
                            <th scope="col">Punkte</th>
                            <th scope="col">' . $n1->name . '</th>
                            <th scope="col">' . $n2->name . '</th>
                            <th scope="col">' . $n3->name . '</th>
                        </tr>
                    </thead>
                    <tbody>';
    $data = sql("select anzahl from spiele where id = " . $_GET['s'] . ";");
    while ($row = pg_fetch_row($data)) {
        $anzahl = $row[0];
    }
    for ($i = 1; $i < $anzahl + 1; $i++) {
        echo '<tr>
            <th scope="row">' . $i . '</th>
            <th scope="row">' . $n1->punkte . '</th>
            <th scope="row">' . $n2->punkte . '</th>
            <th scope="row">' . $n3->punkte . '</th>
            </tr>';
    }
    $d = sql("select spielart from spiele where id = " . $_GET['s'] . "");
    while ($row = pg_fetch_row($d)) {
        $spielart = $row[0];
    }
    echo '
                        <tr>
                            <th>Spielart</th>
                            <th>' . $spielart . '</th>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="d-flex flex-row">';
    $count = count($s->karten);
    for ($i = 0; $i < $count; $i++) {
        echo '<div class="card m-0.5" style="width: 9vw;">
            <img id="' . $i . '" class="card-img-top img-fluid" src="karten/' . (!(isset($s->karten[$i])) ? 
            'deckblatt.jpg' : $s->karten[$i]) . '" alt="Card image cap">
    </div>';
    }
    echo '
</div>
</div>
</div>
';

}

function frage($spielart, $bieten_heben, $frage_gestellt)
{
    echo '
<!-- Modal -->
<div class="modal fade" id="frage_modal" tabindex="-1" role="dialog" aria-labelledby="frage_modalLabel"
    aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title" id="frage_modalLabel"> Möchtest du ' . $spielart . ' ' . $bieten_heben . '?</h2>
                <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-footer">
                <form method="post">
                    <input type="submit" value="ja" name="ja" class="btn btn-primary">
                    <input type="submit" value="nein" name="nein" class="btn btn-primary">
                </form>
            </div>
        </div>
    </div>
</div>';
    echo '
<script id="modalshow" type="text/javascript">
    $(window).on("load", function () {
      $("#frage_modal").modal("show");
    })  </script>';
}
?>