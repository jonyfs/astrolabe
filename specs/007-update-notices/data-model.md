# Data model: Clickable update notices

- `UpdateItem`: `{ id: 'gstack' | 'specify' | 'speckit-skills' | 'astrolabe'; installed: string;
  latest: string }`.
- `$.store` `updates`: `{ checkedOn: 'YYYY-MM-DD'; items: UpdateItem[] }`.
- `$.state` `astrolabe.updates`: `{ items: UpdateItem[]; confirming?: UpdateItem['id'];
  running?: UpdateItem['id'] }`.
