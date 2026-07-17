' Meridian v2 — sobe o servidor e abre como APP (janela PWA, sem abas).
' Modo: Edge/Chrome --app=URL  (mesma sensacao de "Instalar app" / standalone)
Option Explicit

Dim fso, shell, root, port, url, alreadyUp, i, bat, http

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

root = fso.GetParentFolderName(WScript.ScriptFullName)
port = "3457"
url = "http://127.0.0.1:" & port & "/"
bat = root & "\Iniciar-Servidor-v2.bat"

If Not fso.FileExists(root & "\serve.js") Then
  MsgBox "serve.js nao encontrado em:" & vbCrLf & root, vbCritical, "Meridian v2"
  WScript.Quit 1
End If

If Not fso.FileExists(bat) Then
  MsgBox "Iniciar-Servidor-v2.bat nao encontrado.", vbCritical, "Meridian v2"
  WScript.Quit 1
End If

alreadyUp = ServerIsUp(url)
If Not alreadyUp Then
  ' 7 = minimizado (o "app" e a janela do navegador em modo --app)
  shell.Run """" & bat & """", 7, False
  For i = 1 To 25
    WScript.Sleep 300
    If ServerIsUp(url) Then
      alreadyUp = True
      Exit For
    End If
  Next
End If

OpenAsApp url

If Not alreadyUp Then
  MsgBox "O servidor demorou para subir." & vbCrLf & vbCrLf & _
    "Confira se o Node.js esta instalado e se a porta " & port & " esta livre." & vbCrLf & _
    "URL: " & url, vbExclamation, "Meridian v2"
End If

' ── helpers ────────────────────────────────────────────────────────────────

Function ServerIsUp(u)
  Dim h
  ServerIsUp = False
  On Error Resume Next
  Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  If h Is Nothing Then Set h = CreateObject("MSXML2.XMLHTTP")
  h.setTimeouts 800, 800, 800, 800
  h.Open "GET", u, False
  h.Send
  If Err.Number = 0 Then
    If h.Status >= 200 And h.Status < 500 Then ServerIsUp = True
  End If
  Err.Clear
  On Error GoTo 0
End Function

' Abre em janela de aplicativo (sem barra de abas / UI completa do browser).
' Equivalente visual a uma PWA com display: standalone.
Sub OpenAsApp(u)
  Dim candidates, c, exe
  candidates = Array( _
    shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"), _
    shell.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"), _
    shell.ExpandEnvironmentStrings("%LocalAppData%\Microsoft\Edge\Application\msedge.exe"), _
    shell.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe"), _
    shell.ExpandEnvironmentStrings("%LocalAppData%\Google\Chrome\Application\chrome.exe"), _
    shell.ExpandEnvironmentStrings("%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"), _
    shell.ExpandEnvironmentStrings("%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe") _
  )
  For Each c In candidates
    If fso.FileExists(c) Then
      ' --app = janela dedicada; --new-window evita reutilizar janela normal
      shell.Run """" & c & """ --app=" & u & " --new-window", 1, False
      Exit Sub
    End If
  Next
  ' Fallback: navegador padrao (aba normal)
  shell.Run u, 1, False
End Sub
