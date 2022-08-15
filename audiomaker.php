<?php
require "config.php";
if (isset($_GET['to'])) {
    $d = sql("select * from spiele where jetztdran='" . $data->name . "';");
    if ((pg_num_rows($d) > 0)) {
        echo '
            <iframe src="jetztdran.mp3" allow="autoplay" style="display:none" id="iframeAudio">
            </iframe>
        ';
    }
}
?>