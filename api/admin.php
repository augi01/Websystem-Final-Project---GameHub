<?php
$ADMIN_PASSWORD = '202480035augi'; 
$SUPABASE_URL   = 'https://kkwgodtsatrmnvssojxt.supabase.co';
$SUPABASE_KEY   = $_ENV['SUPABASE_SECRET_KEY'] ?? $_SERVER['SUPABASE_SECRET_KEY'] ?? getenv('SUPABASE_SECRET_KEY') ?: '';

$authToken = hash('sha256', $ADMIN_PASSWORD . $SUPABASE_URL);
$message = '';
$error = '';

function supabaseRequest(string $url, string $method, string $apiKey, array $extraHeaders = []): array {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge([
        "apikey: $apiKey",
        "Authorization: Bearer $apiKey"
    ], $extraHeaders));
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [$code, $body];
}

// LOGIN AND UI

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'login') {
        if (($_POST['password'] ?? '') === $ADMIN_PASSWORD) {
            setcookie('gamehub_admin', $authToken, [
                'expires'  => time() + 86400,
                'path'     => '/',
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            header('Location: /api/admin.php');
            exit;
        } else {
            $error = 'Incorrect admin password.';
        }
    } elseif ($_POST['action'] === 'logout') {
        setcookie('gamehub_admin', '', time() - 3600, '/');
        header('Location: /api/admin.php');
        exit;
    }
}

$isLoggedIn = (($_COOKIE['gamehub_admin'] ?? '') === $authToken);

// ==========================================
// 3. DELETE PROFILE HANDLER (WITH AUTO-CASCADE)
// ==========================================
if ($isLoggedIn && $_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_user') {
    $col   = $_POST['del_col'] ?? 'username';
    $val   = trim($_POST['del_val'] ?? '');
    $label = trim($_POST['del_label'] ?? $val);

    if ($val !== '' && in_array($col, ['id', 'username'], true)) {
        $delUrl = $SUPABASE_URL . '/rest/v1/profiles?' . $col . '=eq.' . urlencode($val);
        [$httpCode, $delResponse] = supabaseRequest($delUrl, 'DELETE', $SUPABASE_KEY, [
            "Prefer: return=representation"
        ]);

        // If HTTP 409 (Foreign Key Conflict), clean up linked child tables and retry
        $attempts = 0;
        while ($httpCode === 409 && $attempts < 6) {
            $attempts++;
            $errJson = json_decode($delResponse, true) ?? [];
            $details = $errJson['details'] ?? '';
            $msg     = $errJson['message'] ?? '';

            $childTable = '';
            if (preg_match('/referenced from table "([a-zA-Z0-9_]+)"/', $details, $m)) {
                $childTable = $m[1];
            } elseif (preg_match('/on table "([a-zA-Z0-9_]+)"/', $msg, $m)) {
                $childTable = $m[1];
            }

            if ($childTable === '' || $childTable === 'profiles') {
                break;
            }

            $refCol = $col;
            $refVal = $val;
            if (preg_match('/Key \(([a-zA-Z0-9_]+)\)=\(([^)]+)\)/', $details, $km)) {
                $refCol = $km[1];
                $refVal = $km[2];
            }

            $candidateFkCols = ($refCol === 'username')
                ? ['username', 'player_username', 'user_id', 'player_id']
                : ['user_id', 'player_id', 'profile_id', 'owner_id', 'id'];

            foreach ($candidateFkCols as $fkCol) {
                $childDelUrl = $SUPABASE_URL . '/rest/v1/' . $childTable . '?' . $fkCol . '=eq.' . urlencode($refVal);
                supabaseRequest($childDelUrl, 'DELETE', $SUPABASE_KEY);
            }

            // Retry deleting the main profile
            [$httpCode, $delResponse] = supabaseRequest($delUrl, 'DELETE', $SUPABASE_KEY, [
                "Prefer: return=representation"
            ]);
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            $deletedRows = json_decode($delResponse, true);
            if (!empty($deletedRows)) {
                $message = "Deleted profile: " . htmlspecialchars($label);
            } else {
                $error = "0 rows deleted. Make sure SUPABASE_SECRET_KEY is saved in Vercel Environment Variables.";
            }
        } else {
            $errDetails = json_decode($delResponse, true);
            $reason = $errDetails['message'] ?? "HTTP $httpCode";
            $extra  = !empty($errDetails['details']) ? " (" . $errDetails['details'] . ")" : "";
            $error  = "Delete failed: " . htmlspecialchars($reason . $extra);
        }
    }
}

// ==========================================
// 4. HEALTH CHECK & FETCH PLAYERS (CRUD: READ)
// ==========================================
$dbStatus = 'OFFLINE';
$players  = [];
$columns  = [];
$pingMs   = 0;

if ($isLoggedIn) {
    $startTime = microtime(true);
    $fetchUrl  = $SUPABASE_URL . '/rest/v1/profiles?select=*';

    [$httpCode, $response] = supabaseRequest($fetchUrl, 'GET', $SUPABASE_KEY);
    $pingMs = round((microtime(true) - $startTime) * 1000);

    if ($httpCode === 200) {
        $dbStatus = 'ONLINE';
        $players  = json_decode($response, true) ?? [];

        if (!empty($players)) {
            foreach (array_keys($players[0]) as $colName) {
                if ($colName !== 'id') {
                    $columns[] = $colName;
                }
            }
        }
    } else {
        $error = "Database connection failed (HTTP $httpCode). Check SUPABASE_SECRET_KEY in Vercel.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GameHub — PHP Admin Backend</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 960px; margin: 0 auto; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 20px; overflow-x: auto; }
        h1, h2 { margin-top: 0; }
        .badge { padding: 5px 12px; border-radius: 999px; font-size: 0.85rem; font-weight: bold; }
        .online { background: #065f46; color: #34d399; }
        .offline { background: #7f1d1d; color: #fca5a5; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #334155; white-space: nowrap; }
        th { color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
        input[type="password"] { padding: 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: white; width: 100%; box-sizing: border-box; }
        button { padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .btn-primary { background: #6366f1; color: white; width: 100%; }
        .btn-danger { background: #ef4444; color: white; padding: 6px 12px; font-size: 0.8rem; }
        .btn-muted { background: #334155; color: #cbd5e1; }
        .alert { padding: 12px; border-radius: 8px; margin-bottom: 15px; }
        .alert-success { background: #064e3b; color: #6ee7b7; }
        .alert-error { background: #7f1d1d; color: #fca5a5; }
        .header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    </style>
</head>
<body>
<div class="container">

    <?php if (!$isLoggedIn): ?>
        <div class="card" style="max-width: 380px; margin: 60px auto; text-align: center;">
            <h2>GameHub Admin Panel</h2>
            <p style="color: #94a3b8; font-size: 0.9rem;">Server-Side PHP Backend</p>
            <?php if ($error): ?><div class="alert alert-error"><?= $error ?></div><?php endif; ?>
            <form method="POST">
                <input type="hidden" name="action" value="login">
                <input type="password" name="password" placeholder="Enter Admin Password" required><br><br>
                <button type="submit" class="btn-primary">Login to Backend</button>
            </form>
        </div>

    <?php else: ?>
        <div class="header-row" style="margin-bottom: 20px;">
            <h1>GameHub Admin Backend</h1>
            <div>
                <a href="/" style="color: #94a3b8; margin-right: 15px; text-decoration: none;">← Back to GameHub</a>
                <form method="POST" style="display: inline;">
                    <input type="hidden" name="action" value="logout">
                    <button type="submit" class="btn-muted">Logout</button>
                </form>
            </div>
        </div>

        <?php if ($message): ?><div class="alert alert-success"><?= $message ?></div><?php endif; ?>
        <?php if ($error): ?><div class="alert alert-error"><?= $error ?></div><?php endif; ?>

        <!-- SYSTEM HEALTH MONITOR -->
        <div class="card">
            <div class="header-row">
                <div>
                    <h2 style="margin-bottom: 4px;">Server & Database Status</h2>
                    <span style="color: #94a3b8; font-size: 0.9rem;">
                        PHP Version: <?= phpversion() ?> • Database Response: <?= $pingMs ?>ms
                    </span>
                </div>
                <span class="badge <?= $dbStatus === 'ONLINE' ? 'online' : 'offline' ?>">
                    ● <?= $dbStatus ?>
                </span>
            </div>
        </div>

        <!-- PLAYER DATABASE MANAGEMENT -->
        <div class="card">
            <div class="header-row">
                <h2>Database Profiles (<?= count($players) ?>)</h2>
                <button onclick="window.location.reload()" class="btn-muted">Refresh</button>
            </div>

            <table>
                <thead>
                    <tr>
                        <?php foreach ($columns as $col): ?>
                            <th><?= htmlspecialchars($col) ?></th>
                        <?php endforeach; ?>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($players)): ?>
                        <tr><td colspan="10" style="text-align: center; color: #94a3b8;">No profiles found in database.</td></tr>
                    <?php else: ?>
                        <?php foreach ($players as $p): ?>
                            <?php
                                $delCol   = isset($p['id']) ? 'id' : 'username';
                                $delVal   = $p[$delCol] ?? '';
                                $delLabel = $p['username'] ?? $delVal;
                            ?>
                            <tr>
                                <?php foreach ($columns as $col): ?>
                                    <?php
                                        $cell = $p[$col] ?? '';
                                        if (is_array($cell)) $cell = json_encode($cell);
                                    ?>
                                    <td><?= htmlspecialchars((string)$cell) ?></td>
                                <?php endforeach; ?>
                                <td>
                                    <form method="POST" onsubmit="return confirm('Delete this profile and all its game data permanently?');">
                                        <input type="hidden" name="action" value="delete_user">
                                        <input type="hidden" name="del_col" value="<?= htmlspecialchars($delCol) ?>">
                                        <input type="hidden" name="del_val" value="<?= htmlspecialchars((string)$delVal) ?>">
                                        <input type="hidden" name="del_label" value="<?= htmlspecialchars((string)$delLabel) ?>">
                                        <button type="submit" class="btn-danger">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>

</div>
</body>
</html>