import { Box, Text } from 'ink';
import type { ToolCall, ToolResult } from '../types.js';

interface ToolCallProps {
  calls: ToolCall[];
  results?: ToolResult[];
}

export function ToolCallDisplay({ calls, results }: ToolCallProps) {
  return (
    <Box flexDirection="column" marginY={1}>
      {calls.map((call) => {
        const result = results?.find((r) => r.toolCallId === call.id);
        return (
          <Box key={call.id} flexDirection="column" marginBottom={1}>
            <Text dimColor>
              {'>'} {call.name}(
              {JSON.stringify(call.arguments).slice(0, 120)}
              {JSON.stringify(call.arguments).length > 120 ? '...' : ''})
            </Text>
            {result && (
              <Box marginLeft={2}>
                <Text dimColor color={result.error ? 'red' : 'green'}>
                  {result.error ? 'Error' : 'Done'}: {result.output.slice(0, 1000)}
                  {result.output.length > 1000 ? '...' : ''}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
