// The usage question (spec 015): the question, the answers in a Select whose first one, the
// default, is focused so Enter takes it, and when the default goes ahead. A surface without
// Select (mobile) gets one button per answer. The engine follows
// $ only inside register.tsx, so it passes the element table and the pick handler in.
import type { ElementTable } from 'claude-code'

import { t, type Lang } from '../core/i18n'
import type { Tokens } from '../core/theme'
import type { UsageQuestion } from '../core/types'

export const askTree = (
  { Box, Text, Button, Select }: Pick<ElementTable<'mobile'>, 'Box' | 'Text' | 'Button'> & { Select?: ElementTable<'terminal'>['Select'] },
  question: UsageQuestion,
  at: string,
  tokens: Tokens,
  onPick: (value: string) => void,
  lang: Lang = 'en',
) => (
  <Box key="astrolabe-usage-body" flexDirection="column">
    <Text color={tokens.current} wrap="wrap">
      {question.text}
    </Text>
    {Select === undefined ? (
      <Box key="astrolabe-usage-choice" flexDirection="column">
        {question.options.map(o => (
          <Button key={`astrolabe-usage-${o.value}`} label={o.label} onPress={() => onPick(o.value)} />
        ))}
      </Box>
    ) : (
      <Select
        key="astrolabe-usage-choice"
        options={question.options.map(o => ({ value: o.value, label: o.label }))}
        value={question.fallback}
        autoFocus
        onSelect={value => onPick(value)}
      />
    )}
    <Text color={tokens.muted} wrap="truncate-end">
      {t(lang, 'ask.footer', { at })}
    </Text>
  </Box>
)
