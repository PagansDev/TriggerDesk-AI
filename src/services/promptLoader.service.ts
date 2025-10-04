import fs from 'fs/promises';
import path from 'path';

class PromptLoaderService {
  private systemPromptBase: string = '';
  private isLoaded: boolean = false;
  private readonly promptsDir: string;

  constructor() {
    this.promptsDir = path.join(process.cwd(), 'SYSTEM_PROMPTS');
  }

  async initialize(): Promise<void> {
    try {
      console.log(
        '[PromptLoader] Iniciando carregamento dos prompts do sistema...'
      );

      const files = await fs.readdir(this.promptsDir);
      const mdFiles = files.filter((f) => f.endsWith('.md')).sort();

      if (mdFiles.length === 0) {
        throw new Error('Nenhum arquivo .md encontrado em SYSTEM_PROMPTS');
      }

      console.log(
        `[PromptLoader] Encontrados ${mdFiles.length} arquivo(s) .md`
      );

      const promptParts: string[] = [];

      for (const filename of mdFiles) {
        const content = await this.loadPromptFile(filename);
        promptParts.push(content);
      }

      this.systemPromptBase = promptParts.join('\n\n');
      this.isLoaded = true;

      console.log('[PromptLoader] Prompts do sistema carregados com sucesso');
      console.log(
        `[PromptLoader] Total de caracteres: ${this.systemPromptBase.length}`
      );
    } catch (error) {
      console.error(
        '[PromptLoader] ✗ Erro ao carregar prompts do sistema:',
        error
      );
      throw new Error('Falha ao inicializar prompts do sistema');
    }
  }

  private async loadPromptFile(filename: string): Promise<string> {
    const filePath = path.join(this.promptsDir, filename);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`[PromptLoader] Carregado: ${filename}`);
      return content.trim();
    } catch (error) {
      console.error(`[PromptLoader] Erro ao carregar ${filename}:`, error);
      throw new Error(`Falha ao carregar arquivo de prompt: ${filename}`);
    }
  }

  getSystemPrompt(): string {
    if (!this.isLoaded) {
      throw new Error(
        'System prompts não foram carregados. Execute initialize() primeiro.'
      );
    }
    return this.systemPromptBase;
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  async reload(): Promise<void> {
    this.isLoaded = false;
    await this.initialize();
  }
}

export default new PromptLoaderService();
