export interface Module {
  id: string;
  title: string;
  course: string;
  description: string;
  icon: string;
  render: (host: HTMLElement) => void;
}
