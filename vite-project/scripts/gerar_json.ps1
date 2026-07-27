param(
    [string]$Planilha,
    [string]$Saida,
    [string]$Aba = "Vendas a partir 2022"
)

$ErrorActionPreference = "Stop"

$baseDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

if (-not $Planilha) {
    $Planilha = Join-Path $baseDir "backend\data\base.xlsb"
}

if (-not $Saida) {
    $Saida = Join-Path $baseDir "backend\data\dados.json"
}

$Planilha = (Resolve-Path $Planilha).Path
$Saida = [System.IO.Path]::GetFullPath($Saida)

function Normalize-Text {
    param($Value)

    if ($null -eq $Value) {
        return ""
    }

    return ([string]$Value).Trim()
}

function Clean-Header {
    param($Value)

    $text = ((Normalize-Text $Value) -replace "\s+", " ").Trim()
    $decomposed = $text.Normalize([Text.NormalizationForm]::FormD)
    $builder = [Text.StringBuilder]::new()

    foreach ($character in $decomposed.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($character)

        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($character)
        }
    }

    return $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function Normalize-Date {
    param($Value)

    if ($null -eq $Value -or $Value -eq "") {
        return ""
    }

    if ($Value -is [DateTime]) {
        return $Value.ToString("yyyy-MM-dd")
    }

    if ($Value -is [ValueType]) {
        try {
            return [DateTime]::FromOADate([double]$Value).ToString("yyyy-MM-dd")
        }
        catch {
            return [string]$Value
        }
    }

    $text = ([string]$Value).Trim()
    $formats = @("dd/MM/yyyy", "yyyy-MM-dd", "dd-MM-yyyy")
    $parsed = [DateTime]::MinValue

    foreach ($format in $formats) {
        if ([DateTime]::TryParseExact(
            $text,
            $format,
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::None,
            [ref]$parsed
        )) {
            return $parsed.ToString("yyyy-MM-dd")
        }
    }

    return $text
}

function Normalize-Month {
    param($Value)

    if ($null -eq $Value -or $Value -eq "") {
        return ""
    }

    if ($Value -is [DateTime]) {
        return $Value.ToString("MM/yyyy")
    }

    if ($Value -is [ValueType]) {
        try {
            return [DateTime]::FromOADate([double]$Value).ToString("MM/yyyy")
        }
        catch {
            return [string]$Value
        }
    }

    $text = ([string]$Value).Trim()

    if ($text -match "^(\d{1,2})/(\d{4})$") {
        return ("{0:D2}/{1}" -f [int]$Matches[1], $Matches[2])
    }

    $normalizedDate = Normalize-Date $Value
    $parsed = [DateTime]::MinValue

    if ([DateTime]::TryParseExact(
        $normalizedDate,
        "yyyy-MM-dd",
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::None,
        [ref]$parsed
    )) {
        return $parsed.ToString("MM/yyyy")
    }

    return $text
}

function Normalize-Number {
    param($Value)

    if ($null -eq $Value -or $Value -eq "") {
        return 0.0
    }

    if ($Value -is [ValueType]) {
        return [double]$Value
    }

    $text = ([string]$Value).Trim()
    $text = $text.Replace("R$", "").Replace(".", "").Replace(",", ".").Trim()
    $parsed = 0.0

    if ([double]::TryParse(
        $text,
        [Globalization.NumberStyles]::Float,
        [Globalization.CultureInfo]::InvariantCulture,
        [ref]$parsed
    )) {
        return $parsed
    }

    return 0.0
}

function Release-ComObject {
    param($ComObject)

    if ($null -ne $ComObject) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($ComObject)
    }
}

$excel = $null
$workbook = $null
$worksheet = $null
$usedRange = $null

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $workbook = $excel.Workbooks.Open($Planilha, 0, $true)
    $worksheet = $workbook.Worksheets.Item($Aba)
    $usedRange = $worksheet.UsedRange
    $values = $usedRange.Value2
    $rowCount = $usedRange.Rows.Count
    $columnCount = $usedRange.Columns.Count

    $headerRow = $null

    for ($row = 1; $row -le [Math]::Min(20, $rowCount); $row++) {
        $candidateHeaders = @{}

        for ($column = 1; $column -le $columnCount; $column++) {
            $header = Clean-Header $values[$row, $column]

            if ($header) {
                $candidateHeaders[$header] = $column
            }
        }

        if (
            $candidateHeaders.ContainsKey("PI") -and
            $candidateHeaders.ContainsKey("Nome do Anunciante") -and
            $candidateHeaders.ContainsKey("Produto") -and
            $candidateHeaders.ContainsKey("Valor bruto")
        ) {
            $headerRow = $row
            $headers = $candidateHeaders
            break
        }
    }

    if ($null -eq $headerRow) {
        throw "Não foi possível localizar a linha de cabeçalho."
    }

    function Get-CellValue {
        param(
            [int]$Row,
            [string[]]$Names
        )

        foreach ($name in $Names) {
            if ($headers.ContainsKey($name)) {
                return $values[$Row, $headers[$name]]
            }
        }

        return $null
    }

    $data = [Collections.Generic.List[object]]::new()

    for ($row = $headerRow + 1; $row -le $rowCount; $row++) {
        $pi = Normalize-Text (Get-CellValue $row @("PI"))

        if (-not $pi) {
            continue
        }

        $data.Add([ordered]@{
            pi                 = $pi
            anunciante         = Normalize-Text (Get-CellValue $row @("Nome do Anunciante"))
            cnpjAnunciante     = Normalize-Text (Get-CellValue $row @("CNPJ do Anunciante"))
            tipoPi             = Normalize-Text (Get-CellValue $row @("Sub Perfil Anunciante"))
            piMatriz           = Normalize-Text (Get-CellValue $row @("PI Matriz"))
            campanha           = Normalize-Text (Get-CellValue $row @("Nome Campanha"))
            executivo          = Normalize-Text (Get-CellValue $row @("Executivo"))
            diretoria          = Normalize-Text (Get-CellValue $row @("Diretoria"))
            canal              = Normalize-Text (Get-CellValue $row @("Canal"))
            produto            = Normalize-Text (Get-CellValue $row @("Produto"))
            agencia            = Normalize-Text (Get-CellValue $row @("Nome da Agencia"))
            razaoSocialAgencia = Normalize-Text (Get-CellValue $row @("Razao Social Agencia"))
            cnpjAgencia        = Normalize-Text (Get-CellValue $row @("CNPJ Agencia"))
            ufCliente          = Normalize-Text (Get-CellValue $row @("UF Cliente"))
            ufAgencia          = Normalize-Text (Get-CellValue $row @("UF Agencia"))
            perfil             = Normalize-Text (Get-CellValue $row @("Perfil Anunciante"))
            mesVenda           = Normalize-Month (Get-CellValue $row @("Mes da venda"))
            dataVenda          = Normalize-Date (Get-CellValue $row @("Data da venda"))
            inicioVeiculacao   = Normalize-Date (Get-CellValue $row @(
                "Data inicial veiculacao"
            ))
            fimVeiculacao      = Normalize-Date (Get-CellValue $row @("Data Final Veiculacao"))
            vencimento         = Normalize-Date (Get-CellValue $row @("Vencimento"))
            valorBruto         = Normalize-Number (Get-CellValue $row @("Valor bruto"))
            valorLiquido       = Normalize-Number (Get-CellValue $row @("Valor liquido"))
            observacoes        = Normalize-Text (Get-CellValue $row @("Observacoes"))
        })
    }

    $outputDirectory = Split-Path -Parent $Saida
    [IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

    $json = $data | ConvertTo-Json -Depth 4
    $jsonLines = $json -split "\r?\n"
    $json = ($jsonLines | ForEach-Object {
        if ($_ -match "^ +") {
            $indentLength = $Matches[0].Length
            (" " * [Math]::Floor($indentLength / 2)) + $_.Substring($indentLength)
        }
        else {
            $_
        }
    }) -join "`n"

    [IO.File]::WriteAllText($Saida, $json, [Text.UTF8Encoding]::new($false))

    Write-Output "JSON gerado com sucesso: $Saida"
    Write-Output "Total de registros: $($data.Count)"
}
finally {
    if ($null -ne $workbook) {
        $workbook.Close($false)
    }

    if ($null -ne $excel) {
        $excel.Quit()
    }

    Release-ComObject $usedRange
    Release-ComObject $worksheet
    Release-ComObject $workbook
    Release-ComObject $excel

    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
