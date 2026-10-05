import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { DownloadArtifactButton } from '@/components/kasif/DownloadArtifactButton';
jest.mock('next-intl', () => ({ useTranslations: () => (key) => key }));

beforeEach(() => {
  URL.createObjectURL = jest.fn().mockReturnValue('blob:artifact');
  URL.revokeObjectURL = jest.fn();
});

it('offers a named text file with Turkish characters and releases it when closed', async () => {
  const view = render(<DownloadArtifactButton text="İçerik: çağrı ve özet" packId="seo-brief" />);
  const link = screen.getByRole('link', { name: 'packs.downloadArtifact' });
  expect(link).toHaveAttribute('download', 'kasif-seo-brief.txt');
  expect(link).toHaveAttribute('href', 'blob:artifact');
  const blob = URL.createObjectURL.mock.calls[0][0];
  const text = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
  expect(text).toContain('İçerik: çağrı ve özet');
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:artifact');
});

it('does not download empty output', () => {
  render(<DownloadArtifactButton text="" packId="seo-brief" />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
