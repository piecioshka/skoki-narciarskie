declare namespace App {
  interface Locals {
    /** Icons whose path (with id) is already on the page being rendered. */
    renderedIcons?: Set<string>;
  }
}
