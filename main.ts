// Church encoded types

export type Unit = <R>(r: R) => R;
export const Unit: Unit = (r) => r;

export type Maybe<A> = <R>(nothing: R, just: (r: A) => R) => R;
export const Just = <A>(x: A): Maybe<A> => (_nothing, just) => just(x);
// deno-lint-ignore no-explicit-any
export const Nothing: Maybe<any> = (nothing, _just) => nothing;

export const fmapMaybe = <A, R>(f: (a: A) => R, m: Maybe<A>): Maybe<R> =>
  m(Nothing as Maybe<R>, (x) => Just(f(x)));

export const pureMaybe = Just;
export const apMaybe = <A, B>(mf: Maybe<(a: A) => B>, ma: Maybe<A>): Maybe<B> =>
  mf(Nothing, (f) => fmapMaybe(f, ma));

export const bindMaybe = <A, B>(
  ma: Maybe<A>,
  f: (a: A) => Maybe<B>,
): Maybe<B> => ma(Nothing, f);

export const emptyMaybe = Nothing;
export const altMaybe = <A>(ma: Maybe<A>, mb: Maybe<A>): Maybe<A> =>
  ma(mb, Just);

export type Pair<A, B> = <R>(f: (a: A, b: B) => R) => R;
export const Pair = <A, B>(a: A, b: B): Pair<A, B> => (f) => f(a, b);

export const fst = <A, B>(p: Pair<A, B>): A => p((a, _b) => a);
export const snd = <A, B>(p: Pair<A, B>): B => p((_a, b) => b);
export const fmapPair = <A, B, R>(f: (a: B) => R, p: Pair<A, B>): Pair<A, R> =>
  Pair(fst(p), f(snd(p)));

export type List<A> = <R>(cons: (a: A, r: R) => R, nil: R) => R;
// deno-lint-ignore no-explicit-any
export const Nil: List<any> = (_cons, nil) => nil;
export const Cons = <A>(x: A, xs: List<A>): List<A> => (cons, nil) =>
  cons(x, xs(cons, nil));

export const maybeHead = <A>(xs: List<A>): Maybe<A> =>
  xs((h, _t) => Just(h), Nothing);
export const tail = <A>(xs: List<A>): List<A> => drop(1, xs);
export const length = <A>(xs: List<A>): number => xs((_h, t) => 1 + t, 0);
export const append = <A>(xs: List<A>, ys: List<A>): List<A> => (cons, nil) =>
  xs(cons, ys(cons, nil));
export const reverse = <A>(xs: List<A>): List<A> =>
  xs((h, t) => append(t, pureList(h)), Nil);
export const take = <A>(n: number, xs: List<A>): List<A> =>
  n <= 0 ? Nil : xs((h, t) => Cons(h, take(n - 1, t)), Nil);
export const drop = <A>(n: number, xs: List<A>): List<A> =>
  xs(
    (x: A, f: (n: number) => List<A>) => (i: number) =>
      i < n ? f(i + 1) : Cons(x, f(i + 1)),
    constFunc(Nil),
  )(0);
export const replicate = <A>(n: number, element: A): List<A> =>
  n <= 0 ? Nil : Cons(element, replicate(n - 1, element));

export const zip = <A, B>(xs: List<A>, ys: List<B>): List<Pair<A, B>> =>
  Pair(maybeHead(xs), maybeHead(ys))((ma, mb) =>
    bindMaybe(ma, (a) => bindMaybe(mb, (b) => pureMaybe(Pair(a, b))))
  )(Nil, (p) => Cons(p, zip(tail(xs), tail(ys))));

export const fmapList = <A, B>(f: (a: A) => B, xs: List<A>): List<B> =>
  xs((h, t) => Cons(f(h), t), Nil);

export const pureList = <A>(a: A): List<A> => Cons(a, Nil as List<A>);
export const apList = <A, B>(af: List<(a: A) => B>, ax: List<A>): List<B> =>
  af((f, t) => append(fmapList(f, ax), t), Nil);

export const arrayToList = <A>(arr: A[]): List<A> =>
  arr.toReversed().reduce((xs, x) => Cons(x, xs), Nil as List<A>);
export const listToArray = <A>(list: List<A>): A[] =>
  list((x, xs) => [x].concat(xs), [] as A[]);

export const strToList = (s: string): List<string> =>
  arrayToList(Array.from(s));
export const listToStr = (xs: List<string>): string =>
  xs((y, ys) => y + ys, "");

// Helpers

export const flip =
  <A, B, R>(f: (a: A) => (b: B) => R) => (b: B) => (a: A): R => f(a)(b);
export const constFunc = <A, B>(a: A) => (_b: B): A => a;
export const curry = <A, B, R>(f: (a: A, b: B) => R) => (a: A) => (b: B): R =>
  f(a, b);
export const uncurry = <A, B, R>(f: (a: A) => (b: B) => R) => (a: A, b: B): R =>
  f(a)(b);

export const lookup = <K, V>(key: K, xs: List<Pair<K, V>>): Maybe<V> =>
  xs(
    (h, t) => fst(h) === key ? Just(snd(h)) : t,
    Nothing as Maybe<V>,
  );

// Parser combinator

export type Parser<A> = (input: List<string>) => Maybe<Pair<List<string>, A>>;

export const fmapParser =
  <A, R>(f: (a: A) => R, p: Parser<A>): Parser<R> => (input: List<string>) =>
    fmapMaybe((b) => fmapPair(f, b), p(input));

export const pureParser = <A>(a: A): Parser<A> => (input) =>
  Just(Pair(input, a));
export const apParser =
  <A, B>(pf: Parser<(a: A) => B>, px: Parser<A>): Parser<B> => (input) =>
    bindMaybe(
      pf(input),
      (a) => fmapMaybe((b) => Pair(fst(b), snd(a)(snd(b))), px(fst(a))),
    );

export const seqLeftParser = <A, B>(pa: Parser<A>, pb: Parser<B>): Parser<A> =>
  apParser(fmapParser(constFunc, pa), pb);
export const seqRightParser = <A, B>(pa: Parser<A>, pb: Parser<B>): Parser<B> =>
  apParser(fmapParser(flip(constFunc), pa), pb);

export const emptyParser = (_input: List<string>) => Nothing;
export const altParser =
  <A>(p1: Parser<A>, p2: Parser<A>): Parser<A> => (input: List<string>) =>
    altMaybe(p1(input), p2(input));
export const manyParser = <A>(v: Parser<A>): Parser<List<A>> =>
  altParser(someParser(v), pureParser(Nil));
export const someParser = <A>(v: Parser<A>): Parser<List<A>> => (input) =>
  bindMaybe(v(input), (first) => {
    const remainingInput = fst(first);

    return length(remainingInput) >= length(input)
      ? Nothing
      : manyParser(v)(remainingInput)(
        Just(Pair(remainingInput, pureList(snd(first)))),
        (rest) => Just(Pair(fst(rest), Cons(snd(first), snd(rest)))),
      );
  });

export const sequenceAListParser = <A>(xs: List<Parser<A>>): Parser<List<A>> =>
  xs(
    (h, t) =>
      apParser(
        fmapParser(curry(Cons), h),
        t,
      ),
    pureParser(Nil as List<A>),
  );

export const satisfyP =
  (f: (a: string) => boolean): Parser<string> => (input) =>
    bindMaybe(
      maybeHead(input),
      (h) => f(h) ? Just(Pair(tail(input), h)) : Nothing,
    );
export const charP = (x: string): Parser<string> => satisfyP((i) => x === i);
export const stringP = (xs: List<string>): Parser<List<string>> =>
  sequenceAListParser(fmapList(charP, xs));

export const sepBy = <A, B>(
  element: Parser<A>,
  sep: Parser<B>,
): Parser<List<A>> =>
  apParser(
    fmapParser(curry(Cons<A>), element),
    manyParser(seqRightParser(sep, element)),
  );

export const eof: Parser<Unit> = (input) =>
  length(input) > 0 ? Nothing : Just(Pair(input, Unit));

export const optional = <A>(p: Parser<A>): Parser<Maybe<A>> =>
  altParser(fmapParser(Just, p), pureParser(Nothing));
export const lookAhead = <A>(p: Parser<A>): Parser<A> => (input) =>
  fmapMaybe((r) => Pair(input, snd(r)), p(input));
export const count = <A>(n: number, p: Parser<A>): Parser<List<A>> =>
  sequenceAListParser(replicate(n, p));
export const choice = <A>(ps: List<Parser<A>>): Parser<A> =>
  ps((h, t) => altParser(h, t), emptyParser);
