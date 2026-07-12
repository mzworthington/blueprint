use clap::Parser;
use dialoguer::{theme::ColorfulTheme, Input};
use std::sync::Arc;

pub mod domain;
pub mod infrastructure;

use crate::domain::analyzer::{CodebaseAnalyzer, CodebaseAnalyzerDependencies};
use crate::domain::ports::LoggerPort;
use crate::infrastructure::fs::StdFileSystemAdapter;
use crate::infrastructure::layout::SimpleGridLayoutAdapter;
use crate::infrastructure::logger::ConsoleLoggerAdapter;
use crate::infrastructure::parser::tree_sitter::TreeSitterParserAdapter;

#[derive(Parser, Debug)]
#[command(
    name = "blueprint",
    version = "0.1.0",
    about = "system architecture generator"
)]
struct CliArgs {
    #[arg(long, default_value = "false")]
    headless: bool,

    #[arg(long, default_value = "**/*.{ts,tsx,py,js,jsx}")]
    glob: String,

    #[arg(long, env = "BLUEPRINT_OUTPUT_DIR", default_value = "blueprints")]
    output: String,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = CliArgs::parse();

    // Check if run in TTY or explicitly requested headless
    let is_headless =
        args.headless || std::env::var("CI").is_ok() || !atty::is(atty::Stream::Stdout);

    let mut glob_pattern = args.glob;
    let mut output_dir = args.output;

    if !is_headless {
        println!("\n🔹 \x1b[1;36mblueprint\x1b[0m • system architecture generator");

        let theme = ColorfulTheme::default();

        glob_pattern = Input::with_theme(&theme)
            .with_prompt("Glob pattern/directory to scan:")
            .default(glob_pattern)
            .interact_text()?;

        output_dir = Input::with_theme(&theme)
            .with_prompt("Directory to output schemas:")
            .default(output_dir)
            .interact_text()?;

        println!("\x1b[36m│\x1b[0m");
    }

    let logger = Arc::new(ConsoleLoggerAdapter::new());
    let file_system = Arc::new(StdFileSystemAdapter::new());
    let layout = Arc::new(SimpleGridLayoutAdapter::new());

    let parser: Arc<dyn crate::domain::ports::ParserPort> =
        Arc::new(TreeSitterParserAdapter::new());

    let analyzer = CodebaseAnalyzer::new(CodebaseAnalyzerDependencies {
        parser,
        layout,
        file_system,
        logger: logger.clone(),
    });

    logger.info("Analyzing codebase structure...");
    if let Err(e) = analyzer.run_analysis(&glob_pattern, &output_dir) {
        logger.error("Failed to complete analysis", Some(&e));
        std::process::exit(1);
    }

    logger.info(&format!(
        "Successfully generated visual layout levels inside: {}",
        output_dir
    ));

    Ok(())
}
