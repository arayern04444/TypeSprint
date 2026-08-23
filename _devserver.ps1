param(
    [string]$Root = (Get-Location).Path,
    [int]$Port = 8123
)

$mimeMap = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        try {
            $localPath = $request.Url.LocalPath
            if ($localPath -eq '/') { $localPath = '/index.html' }
            $filePath = Join-Path $Root ($localPath.TrimStart('/'))
            $filePath = [System.IO.Path]::GetFullPath($filePath)
            if (-not $filePath.StartsWith([System.IO.Path]::GetFullPath($Root))) {
                $response.StatusCode = 403
                $response.Close()
                continue
            }
            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = $mimeMap[$ext]
                if (-not $mime) { $mime = 'application/octet-stream' }
                $response.ContentType = $mime
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $localPath")
                $response.OutputStream.Write($notFound, 0, $notFound.Length)
            }
        } catch {
            $response.StatusCode = 500
        } finally {
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
}
