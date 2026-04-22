import { Box, Text } from 'ink';

interface MarkdownTextProps {
  content: string;
}

export function MarkdownText({ content }: MarkdownTextProps) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <Box flexDirection="column">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).split('\n');
          const lang = lines[0]?.trim();
          const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
          const displayCode = code.length > 2000 ? code.slice(0, 2000) + '\n... (truncated)' : code;
          return (
            <Box key={i} flexDirection="column" marginY={1} paddingX={1}>
              {lang && <Text dimColor>{lang}</Text>}
              <Text color="cyan">{displayCode || '(empty code block)'}</Text>
            </Box>
          );
        }

        // Process headings and inline formatting
        const textLines = part.split('\n');
        return (
          <Box key={i} flexDirection="column">
            {textLines.map((line, lineIdx) => {
              // Headings
              if (line.startsWith('### ')) {
                return <Text key={lineIdx} bold>{line.slice(4)}</Text>;
              }
              if (line.startsWith('## ')) {
                return <Text key={lineIdx} bold underline>{line.slice(3)}</Text>;
              }
              if (line.startsWith('# ')) {
                return <Text key={lineIdx} bold underline color="yellow">{line.slice(2)}</Text>;
              }

              // Inline code and bold/italic
              const inlineParts = line.split(/(`[^`]+`)/g);
              return (
                <Box key={lineIdx} flexDirection="row" flexWrap="wrap">
                  {inlineParts.map((inline, j) => {
                    if (inline.startsWith('`') && inline.endsWith('`')) {
                      return <Text key={j} color="green">{inline}</Text>;
                    }
                    // Bold text
                    const boldParts = inline.split(/(\*\*[^*]+\*\*)/g);
                    return boldParts.map((bp, k) => {
                      if (bp.startsWith('**') && bp.endsWith('**')) {
                        return <Text key={`${j}-${k}`} bold>{bp.slice(2, -2)}</Text>;
                      }
                      return <Text key={`${j}-${k}`}>{bp}</Text>;
                    });
                  })}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
