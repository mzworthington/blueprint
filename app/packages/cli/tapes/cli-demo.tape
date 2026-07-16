# Interactive Blueprint CLI demo — renders docs/screenshots/cli.gif
# Run from app/packages/cli:  vhs tapes/cli-demo.tape
# Or:                        pnpm test:vhs

Output ../../../docs/screenshots/cli.gif

Require bun
Require ttyd
Require ffmpeg

Set Shell bash
Set FontSize 16
Set Width 1100
Set Height 520
Set TypingSpeed 45ms
Set Framerate 24
Set Padding 16
Set Theme "Catppuccin Mocha"

# Record against the real Blueprint repo (not a toy fixture).
Hide
Type "cd ../../.."
Enter
Type "unset CI BLUEPRINT_OUTPUT_DIR"
Enter
Type "rm -rf .vhs-out"
Enter
Type "clear"
Enter
Show

Type "blueprint"
Enter
Sleep 1.5s

# Parser select — accept ts-morph default
Enter
Sleep 900ms

# Context name — accept default
Enter
Sleep 900ms

# Rollup confirm — accept initialValue (false / No)
Enter
Sleep 900ms

# Glob — Blueprint app packages only (keeps the recording focused)
Enter
Sleep 900ms

# Scratch output so the demo does not rewrite committed blueprints/
Type ".vhs-out"
Enter
Sleep 900ms

# Git forensics — move from default "Yes" up to "No — architecture only"
Up
Sleep 400ms
Enter
Sleep 8s

# Leave the success line on screen briefly
Sleep 2s
