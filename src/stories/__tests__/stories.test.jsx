import React from 'react';
import { render } from '@testing-library/react';

import * as hashSpaceStories from '../HashSpaceScene.stories';
import * as scene06Stories from '../Scene06LanesSeparate.stories';
import * as scene07Stories from '../Scene07ServerJoins.stories';
import * as narrationStories from '../NarrationSlide.stories';
import * as countdownStories from '../DeckCountdown.stories';
import * as deckStories from '../StoryDeck.stories';

const STORY_FILES = [
  ['Scene 00 Hash Space', hashSpaceStories],
  ['Scene 06 Lanes Separate', scene06Stories],
  ['Scene 07 Server Joins', scene07Stories],
  ['Narration Slide', narrationStories],
  ['Deck Countdown', countdownStories],
  ['Story Deck', deckStories],
];

/**
 * Storybook is where these scenes are looked at, so a story that throws is the
 * same as the work not existing — and the unit tests will not notice, because
 * they exercise the scenes directly rather than through the arguments a story
 * pins them to.
 *
 * This caught a real one: a timeline refactor dropped two named beats that only
 * the stories still read, and every other test stayed green.
 */
describe('stories', () => {
  STORY_FILES.forEach(([title, module]) => {
    const meta = module.default;
    // A story is anything with args or its own render function; requiring args
    // silently skipped every render-only story, which is most of the newer ones.
    const stories = Object.entries(module).filter(
      ([name, story]) =>
        name !== 'default' && story && typeof story === 'object' && (story.args || story.render)
    );

    it(`declares stories for ${title}`, () => {
      expect(stories.length).toBeGreaterThan(0);
    });

    it.each(stories.map(([name]) => name))(`renders ${title} / %s`, name => {
      const story = Object.fromEntries(stories)[name];
      const args = { ...meta.args, ...story.args };
      // Honour a story's own render function, or the file's default component.
      const element = story.render ? story.render(args) : <meta.component {...args} />;
      const { container } = render(element);

      expect(container.firstChild).toBeTruthy();
    });
  });
});
