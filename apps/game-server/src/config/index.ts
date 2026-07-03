import profanityList from './profanity.json';

export class ConfigService {
  private profanity: string[];

  constructor() {
    this.profanity = profanityList as string[];
  }

  getProfanityList(): string[] {
    return [...this.profanity];
  }
}
