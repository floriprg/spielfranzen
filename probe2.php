<?php
use Firebase\JWT\JWT;

try {
    $decoded = JWT::decode($jwt, $key, array('HS256'));
    $refresh_token = $decoded->data->refresh_token;

}

catch (Exception $e) {
    if ($e->getMessage() == "Expired token") {
        list($header, $payload, $signature) = explode(".", $jwt);
        $payload = json_decode(base64_decode($payload));
        $refresh_token = $payload->data->refresh_token;
    }
    else {

        // set response code
        http_response_code(401);

        // show error message
        echo json_encode(array(
            "message" => "Access denied.",
            "error" => $e->getMessage()
        ));
        die();
    }
}?>