import { screen } from '@testing-library/react-native';

import { BodyText, Caption, Heading } from '@/components/ui/app-text';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('AppText family', () => {
  it('renders Heading with an accessible header role', async () => {
    await renderWithProviders(<Heading>Today</Heading>);

    expect(screen.getByRole('header', { name: 'Today' })).toBeTruthy();
  });

  it('renders BodyText and Caption content', async () => {
    await renderWithProviders(
      <>
        <BodyText>38 min</BodyText>
        <Caption>YOUR MOMENTUM</Caption>
      </>,
    );

    expect(screen.getByText('38 min')).toBeTruthy();
    expect(screen.getByText('YOUR MOMENTUM')).toBeTruthy();
  });
});
