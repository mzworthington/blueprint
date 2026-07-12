use crate::domain::ports::LoggerPort;

pub struct ConsoleLoggerAdapter;

impl ConsoleLoggerAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl LoggerPort for ConsoleLoggerAdapter {
    fn info(&self, msg: &str) {
        println!("\x1b[36m◇\x1b[0m  {}", msg);
    }

    fn warn(&self, msg: &str) {
        println!("\x1b[33m⚠️  [Warning]\x1b[0m {}", msg);
    }

    fn error(&self, msg: &str, err: Option<&str>) {
        if let Some(e) = err {
            eprintln!("\x1b[31m❌ [Error]\x1b[0m {} - {}", msg, e);
        } else {
            eprintln!("\x1b[31m❌ [Error]\x1b[0m {}", msg);
        }
    }
}
