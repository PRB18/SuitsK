#define MyAppName "Krishna Suits"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Krishna Suits"
#define MyAppExeName "Start-Krishna-Suits.cmd"

[Setup]
AppId={{A8DA4E0B-8E92-4AF0-8DB0-4B4A0E2F6D32}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\KrishnaSuits
DefaultGroupName={#MyAppName}
OutputDir=..\dist
OutputBaseFilename=KrishnaSuits-Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
Uninstallable=yes

[Files]
Source: "..\release\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\Krishna Suits"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{commondesktop}\Krishna Suits"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Krishna Suits"; Flags: postinstall nowait skipifsilent

[UninstallDelete]
; The vault is deliberately outside {app} and is never deleted by uninstall.
Type: filesandordirs; Name: "{app}"
