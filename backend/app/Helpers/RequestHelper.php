<?php

namespace App\Helpers;

use Psr\Http\Message\ServerRequestInterface as Request;

class RequestHelper
{
    public static function getJsonData(Request $request): array
    {
        $data = $request->getParsedBody();
        if (is_array($data) && !empty($data)) {
            return $data;
        }

        $raw = (string)$request->getBody();
        if (empty($raw)) {
            $raw = file_get_contents('php://input') ?: '';
        }

        if (!empty($raw)) {
            $decoded = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        return is_array($data) ? $data : [];
    }
}

