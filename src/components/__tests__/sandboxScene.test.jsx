import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import SandboxScene from '../SandboxScene';

const control = label =>
  screen.getAllByRole('button').find(button => {
    const name = button.getAttribute('aria-label') ?? button.textContent;
    return name === label;
  });

/** The cost figures live in the panel column now, as plain SVG text. */
const costLine = label => {
  const node = [...document.querySelectorAll('[data-layer="cost"] text')].find(
    text => text.textContent === label
  );
  return node?.nextElementSibling?.textContent ?? null;
};
const hasCost = () => Boolean(document.querySelector('[data-layer="cost"]'));

describe('the sandbox', () => {
  /**
   * The comparison the whole story is against, and the reason this readout is
   * here at all: the same change without consistent hashing.
   */
  /**
   * Scene 7's claim at whatever numbers somebody picks, against the thing the
   * whole story is an alternative to.
   */
  it('costs a server joining, and says what it would have cost without the ring', () => {
    render(<SandboxScene />);
    expect(hasCost()).toBe(false);

    fireEvent.click(control('Add a server'));
    const ours = Number.parseFloat(costLine('ADDING A SERVER MOVED'));
    const theirs = Number.parseFloat(costLine('WITHOUT THE RING'));

    // A seventh server on a ring of six takes about a seventh.
    expect(ours).toBeGreaterThan(10);
    expect(ours).toBeLessThan(18);
    expect(theirs).toBeGreaterThan(80);
  });

  it('names which way the roster went', () => {
    render(<SandboxScene />);
    fireEvent.click(control('Remove a server'));

    expect(costLine('REMOVING A SERVER MOVED')).toBeTruthy();
    expect(costLine('ADDING A SERVER MOVED')).toBeNull();
  });

  /**
   * Density is a setting, not an event. One number under one heading cannot
   * answer both "what did that server cost" and "what did that dial cost".
   */
  it('costs nothing when only the positions changed', () => {
    render(<SandboxScene />);
    fireEvent.click(control('500'));

    expect(hasCost()).toBe(false);
  });

  it('shows a row per server, and one more when a server is added', () => {
    const { container } = render(<SandboxScene />);
    const rows = () => container.querySelectorAll('[data-layer^="ring:"]').length;

    expect(rows()).toBe(6);
    fireEvent.click(control('Add a server'));
    expect(rows()).toBe(7);
  });

  /**
   * The limits are the palette's, not the model's: two servers is the fewest that
   * can share anything, and the most is however many colours stay apart at
   * hairline widths.
   */
  it('stops at the ends rather than going nowhere quietly', () => {
    const { container } = render(<SandboxScene />);
    const rings = () => container.querySelectorAll('[data-layer^="ring:"]').length;

    for (let step = 0; step < 10; step++) {
      const button = control('Remove a server');
      if (button.disabled) break;
      fireEvent.click(button);
    }
    expect(rings()).toBe(2);
    expect(control('Remove a server').disabled).toBe(true);
  });

  it('goes back to where the story left it', () => {
    render(<SandboxScene />);

    fireEvent.click(control('1'));
    fireEvent.click(control('Add a server'));
    fireEvent.click(control('Reset'));

    expect(control('150').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('6')).toBeTruthy();
  });
});
