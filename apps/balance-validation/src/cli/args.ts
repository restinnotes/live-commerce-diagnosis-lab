export function getOutDir(argv = process.argv): string {
  const index = argv.indexOf('--out-dir');
  return index >= 0 ? argv[index + 1] ?? 'outputs' : 'outputs';
}

export function getConfigPath(argv = process.argv): string | undefined {
  const index = argv.indexOf('--config');
  return index >= 0 ? argv[index + 1] : undefined;
}
