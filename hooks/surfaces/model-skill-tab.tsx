import { getAllSkills, getSkillConfig } from '../core/skill-model-map.js';
import { skillModels } from '../core/skill-models.js';
import { getSkillRunning } from '../register.js';

/** The Model/Skill tab's rows (030): one per skill, its category, tier, model, effort. */
function modelSkillTabBody(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  pane: PaneState,
): Array<{ node: RenderNode; rows: number }> {
  const elements = $.ui.resolve(e)
  const { Box, Text } = elements
  const lang = currentLang()
  const skills = getAllSkills()
  const autoMode = skillModels === 'auto'
  
  // Get the currently running skill from register.tsx
  const activeSkill = getSkillRunning()
  
  const rows: Array<{ node: RenderNode; rows: number }> = []
  
  // Header
  rows.push({ 
    rows: 1, 
    node: (
      <Box flexDirection="row" style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
        <Text bold style={{ width: '180px' }}>Skill</Text>
        <Text bold style={{ width: '80px' }}>Category</Text>
        <Text bold style={{ width: '140px' }}>Tier</Text>
        <Text bold style={{ width: '180px' }}>Model</Text>
        <Text bold style={{ width: '80px' }}>Effort</Text>
        {autoMode && <Text bold style={{ width: '60px' }}>Active</Text>}
      </Box>
    )
  })
  
  // Skill rows grouped by category
  const speckitSkills = skills.filter(s => s.category === 'speckit')
  const gstackSkills = skills.filter(s => s.category === 'gstack')
  
  // Speckit section
  rows.push({ 
    rows: 1, 
    node: (
      <Box style={{ padding: '4px 16px', background: 'var(--accent-bg)' }}>
        <Text color={tokens0.accent} bold>{t(lang, 'models.category.speckit')}</Text>
      </Box>
    )
  })
  
  for (const skill of speckitSkills) {
    const isActive = autoMode && activeSkill === skill.skill
    rows.push({ 
      rows: 1, 
      node: (
        <Box 
          key={`skill-${skill.skill}`} 
          flexDirection="row" 
          style={{ 
            padding: '4px 16px',
            background: isActive ? 'var(--accent-bg)' : undefined,
            borderLeft: isActive ? '3px solid var(--accent)' : undefined,
          }}
        >
          <Text style={{ width: '180px' }}>{skill.skill}</Text>
          <Text color={tokens0.muted} style={{ width: '80px' }}>{skill.category}</Text>
          <Text color={getTierColor(skill.tier)} style={{ width: '140px' }}>{skill.tier}</Text>
          <Text style={{ width: '180px' }} fontFamily="monospace">{skill.model}</Text>
          <Text style={{ width: '80px' }}>{skill.effort}</Text>
          {autoMode && (
            <Text style={{ width: '60px' }}>
              {isActive ? '▸' : ''}
            </Text>
          )}
        </Box>
      )
    })
  }
  
  // gstack section
  rows.push({ 
    rows: 1, 
    node: (
      <Box style={{ padding: '4px 16px', background: 'var(--accent-bg)' }}>
        <Text color={tokens0.accent} bold>{t(lang, 'models.category.gstack')}</Text>
      </Box>
    )
  })
  
  for (const skill of gstackSkills) {
    const isActive = autoMode && activeSkill === skill.skill
    rows.push({ 
      rows: 1, 
      node: (
        <Box 
          key={`skill-${skill.skill}`} 
          flexDirection="row" 
          style={{ 
            padding: '4px 16px',
            background: isActive ? 'var(--accent-bg)' : undefined,
            borderLeft: isActive ? '3px solid var(--accent)' : undefined,
          }}
        >
          <Text style={{ width: '180px' }}>{skill.skill}</Text>
          <Text color={tokens0.muted} style={{ width: '80px' }}>{skill.category}</Text>
          <Text color={getTierColor(skill.tier)} style={{ width: '140px' }}>{skill.tier}</Text>
          <Text style={{ width: '180px' }} fontFamily="monospace">{skill.model}</Text>
          <Text style={{ width: '80px' }}>{skill.effort}</Text>
          {autoMode && (
            <Text style={{ width: '60px' }}>
              {isActive ? '▸' : ''}
            </Text>
          )}
        </Box>
      )
    })
  }
  
  // Auto mode status
  if (autoMode) {
    rows.push({ 
      rows: 1, 
      node: (
        <Box style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
          <Text color={tokens0.muted} size="small">
            {t(lang, 'models.autoModeActive', { active: activeSkill ?? t(lang, 'models.idle') })}
          </Text>
        </Box>
      )
    })
  } else {
    rows.push({ 
      rows: 1, 
      node: (
        <Box style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
          <Text color={tokens0.muted} size="small">
            {t(lang, 'models.autoModeOff')}
          </Text>
        </Box>
      )
    })
  }
  
  return rows
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'deep-reasoning': return 'var(--error)'
    case 'balanced-coding': return 'var(--accent)'
    case 'fast-lightweight': return 'var(--success)'
    default: return 'var(--text)'
  }
}