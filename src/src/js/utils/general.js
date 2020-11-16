import { createPopper } from '@popperjs/core';
import { isString } from './type-check';
import { makeCenteredPopper } from './popper-options';

/**
 * Ensure class prefix ends in `-`
 * @param {string} prefix The prefix to prepend to the class names generated by nano-css
 * @return {string} The prefix ending in `-`
 */
export function normalizePrefix(prefix) {
  if (!isString(prefix) || prefix === '') {
    return '';
  }

  return prefix.charAt(prefix.length - 1) !== '-' ? `${prefix}-` : prefix;
}

/**
 * Checks if options.attachTo.element is a string, and if so, tries to find the element
 * @param {Step} step The step instance
 * @returns {{element, on}}
 * `element` is a qualified HTML Element
 * `on` is a string position value
 */
export function parseAttachTo(step) {
  const options = step.options.attachTo || {};
  const returnOpts = Object.assign({}, options);

  if (isString(options.element)) {
    // Can't override the element in user opts reference because we can't
    // guarantee that the element will exist in the future.
    try {
      returnOpts.element = document.querySelector(options.element);
    } catch (e) {
      // TODO
    }
    if (!returnOpts.element) {
      console.error(
        `The element for this Shepherd step was not found ${options.element}`
      );
    }
  }

  return returnOpts;
}

/**
 * Determines options for the tooltip and initializes
 * `step.tooltip` as a Popper instance.
 * @param {Step} step The step instance
 */
export function setupTooltip(step) {
  if (step.tooltip) {
    step.tooltip.destroy();
  }

  const attachToOptions = parseAttachTo(step);

  let target = attachToOptions.element;
  const popperOptions = getPopperOptions(attachToOptions, step);

  if (step.isCentered()) {
    target = document.body;
    const content = step.shepherdElementComponent.getElement();
    content.classList.add('shepherd-centered');
  }

  step.tooltip = createPopper(target, step.el, popperOptions);
  step.target = attachToOptions.element;

  return popperOptions;
}

/**
 * Create a unique id for steps, tours, modals, etc
 * @return {string}
 */
export function uuid() {
  let d = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Gets the `Popper` options from a set of base `attachTo` options
 * @param attachToOptions
 * @param {Step} step The step instance
 * @return {Object}
 * @private
 */
export function getPopperOptions(attachToOptions, step) {
  let popperOptions = {
    modifiers: [
      {
        name: 'preventOverflow',
        options: {
          altAxis: true
        }
      },
      {
        name: 'focusAfterRender',
        enabled: true,
        phase: 'afterWrite',
        fn() {
          setTimeout(() => {
            if (step.el) {
              step.el.focus();
            }
          }, 300);
        }
      }
    ],
    strategy: 'absolute'
  };

  if (step.isCentered()) {
    popperOptions = makeCenteredPopper(step);
  } else {
    popperOptions.placement = attachToOptions.on;
  }

  const defaultStepOptions =
    step.tour && step.tour.options && step.tour.options.defaultStepOptions;

  if (defaultStepOptions) {
    popperOptions = _mergeModifiers(defaultStepOptions, popperOptions);
  }

  popperOptions = _mergeModifiers(step.options, popperOptions);

  return popperOptions;
}

function _mergeModifiers(stepOptions, popperOptions) {
  if (stepOptions.popperOptions) {
    let mergedPopperOptions = Object.assign(
      {},
      popperOptions,
      stepOptions.popperOptions
    );

    if (
      stepOptions.popperOptions.modifiers &&
      stepOptions.popperOptions.modifiers.length > 0
    ) {
      const names = stepOptions.popperOptions.modifiers.map((mod) => mod.name);
      const filteredModifiers = popperOptions.modifiers.filter(
        (mod) => !names.includes(mod.name)
      );

      mergedPopperOptions.modifiers = Array.from(
        new Set([...filteredModifiers, ...stepOptions.popperOptions.modifiers])
      );
    }

    return mergedPopperOptions;
  }

  return popperOptions;
}