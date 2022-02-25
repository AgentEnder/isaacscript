type FactoryFunction<K, A extends unknown[], V> = (
  key: K,
  ...extraArgs: A
) => V;

type FirstArg<K, A extends unknown[], V> =
  | Iterable<[K, V]>
  | V
  | FactoryFunction<K, A, V>;
type SecondArg<K, A extends unknown[], V> = V | FactoryFunction<K, A, V>;

interface ParsedArgs<K, A extends unknown[], V> {
  iterable: Iterable<[K, V]> | undefined;
  defaultValue: V | undefined;
  defaultValueFactory: FactoryFunction<K, A, V> | undefined;
}

/**
 * An extended Map with some new methods:
 *
 * - `getAndSetDefault` - If the key exists, this will return the same thing as the `get` method.
 *   Otherwise, it will set a default value to the key, and then return the default value.
 * - `getDefaultValue` - Returns the default value to be used for a new key. (If a factory function
 *   was provided during instantiation, this will execute the factory function.)
 * - `getConstructorArg` - Helper method for cloning the map. Returns either the default value or
 *   the reference to the factory function.
 *
 * When instantiating a new DefaultMap, you must specify either a default value or a function that
 * returns a default value.
 *
 * Example:
 * ```ts
 * // Initializes a new empty DefaultMap with a default value of "foo"
 * const defaultMapWithPrimitive = new DefaultMap<string, string>("foo");
 *
 * // Initializes a new empty DefaultMap with a default value of a new Map
 * const defaultMapWithFactory = new DefaultMap<string, Map<string, string>>(() => {
 *   return new Map();
 * });
 *
 * // Initializes a DefaultMap with some initial values and a default value of "bar"
 * const defaultMapWithInitialValues = new DefaultMap<string, string>([
 *   ["a1", "a2"],
 *   ["b1", "b2"],
 * ], "bar");
 * ```
 *
 * If specified, the first argument of a factory function must always be equal to the key:
 *
 * ```ts
 * const defaultMapWithConditionalDefaultValue = new DefaultMap<number, number>((key: number) => {
 *   return isOdd(key) ? 0 : 1;
 * });
 * ```
 *
 * You can also specify a factory function that takes a generic amount of arguments beyond the
 * first:
 *
 * ```ts
 * const defaultMapWithExtraArgs = new DefaultMap<string, string>((_key: string, arg2: boolean) => {
 *   return arg2 ? 0 : 1;
 * })
 * ```
 */
export class DefaultMap<K, A extends unknown[], V> extends Map<K, V> {
  private defaultValue: V | undefined;
  private defaultValueFactory: FactoryFunction<K, A, V> | undefined;

  /**
   * See the DefaultMap documentation:
   * https://isaacscript.github.io/isaacscript-common/classes/types_DefaultMap.DefaultMap.html
   */
  constructor(
    iterableOrDefaultValueOrDefaultValueFactory: FirstArg<K, A, V>,
    defaultValueOrDefaultValueFactory?: SecondArg<K, A, V>,
  ) {
    const { iterable, defaultValue, defaultValueFactory } = parseArguments(
      iterableOrDefaultValueOrDefaultValueFactory,
      defaultValueOrDefaultValueFactory,
    );

    if (defaultValue === undefined && defaultValueFactory === undefined) {
      error(
        "A DefaultMap must be instantiated with either a default value or a function that returns a default value.",
      );
    }

    if (iterable === undefined) {
      super();
    } else {
      super(iterable);
    }

    this.defaultValue = defaultValue;
    this.defaultValueFactory = defaultValueFactory;
  }

  /**
   * If the key exists, this will return the same thing as the `get` method. Otherwise, it will set
   * a default value to the key, and then return the default value.
   */
  getAndSetDefault(key: K, ...extraArgs: A) {
    const value = this.get(key);
    if (value !== undefined) {
      return value;
    }

    const defaultValue = this.getDefaultValue(key, ...extraArgs);
    this.set(key, defaultValue);
    return defaultValue;
  }

  /**
   * Returns the default value to be used for a new key. (If a factory function was provided during
   * instantiation, this will execute the factory function.)
   */
  getDefaultValue(key: K, ...extraArgs: A) {
    if (this.defaultValue !== undefined) {
      return this.defaultValue;
    }

    if (this.defaultValueFactory !== undefined) {
      return this.defaultValueFactory(key, ...extraArgs);
    }

    return error("A DefaultMap was incorrectly instantiated.");
  }

  /**
   * Helper method for cloning the map. Returns either the default value or a reference to the
   * factory function.
   */
  getConstructorArg() {
    if (this.defaultValue !== undefined) {
      return this.defaultValue;
    }

    if (this.defaultValueFactory !== undefined) {
      return this.defaultValueFactory;
    }

    return error("A DefaultMap was incorrectly instantiated.");
  }
}

function parseArguments<K, A extends unknown[], V>(
  firstArg: FirstArg<K, A, V>,
  secondArg?: SecondArg<K, A, V>,
): ParsedArgs<K, A, V> {
  return secondArg === undefined
    ? parseArgumentsOne(firstArg)
    : parseArgumentsTwo(firstArg, secondArg);
}

function parseArgumentsOne<K, A extends unknown[], V>(
  firstArg: FirstArg<K, A, V>,
): ParsedArgs<K, A, V> {
  const arg = firstArg as SecondArg<K, A, V>;
  const { defaultValue, defaultValueFactory } =
    parseDefaultValueOrDefaultValueFactory(arg);
  return {
    iterable: undefined,
    defaultValue,
    defaultValueFactory,
  };
}

function parseArgumentsTwo<K, A extends unknown[], V>(
  firstArg: FirstArg<K, A, V>,
  secondArg: SecondArg<K, A, V>,
): ParsedArgs<K, A, V> {
  const firstArgType = type(firstArg);
  if (firstArgType !== "table") {
    error(
      "A DefaultMap constructor with two arguments must have the first argument be the initializer list.",
    );
  }

  const { defaultValue, defaultValueFactory } =
    parseDefaultValueOrDefaultValueFactory(secondArg);
  return {
    iterable: firstArg as Iterable<[K, V]>,
    defaultValue,
    defaultValueFactory,
  };
}

function parseDefaultValueOrDefaultValueFactory<K, A extends unknown[], V>(
  arg: SecondArg<K, A, V>,
): {
  defaultValue: V | undefined;
  defaultValueFactory: FactoryFunction<K, A, V> | undefined;
} {
  if (typeof arg === "function") {
    return {
      defaultValue: undefined,
      defaultValueFactory: arg as FactoryFunction<K, A, V>,
    };
  }

  if (
    typeof arg === "boolean" ||
    typeof arg === "number" ||
    typeof arg === "string"
  ) {
    return {
      defaultValue: arg,
      defaultValueFactory: undefined,
    };
  }

  return error(
    `A DefaultMap was instantiated with an unknown type of: ${typeof arg}`,
  );
}
