import * as React from "react";
import { unstable_createRemixStub as createRemixStub } from "@remix-run/testing";
import { Outlet } from "@remix-run/react";

import { screen, render } from "./render";

describe("splat routes", () => {
  let ROOT_$ = "FLAT";
  let ROOT_INDEX = "ROOT_INDEX";
  let FLAT_$ = "FLAT";
  let PARENT = "PARENT";
  let NESTED_$ = "NESTED_$";
  let NESTED_INDEX = "NESTED_INDEX";
  let PARENTLESS_$ = "PARENTLESS_$";

  let RemixStub = createRemixStub([
    {
      path: "/",
      element: <h2>{ROOT_INDEX}</h2>,
    },
    {
      path: "/*",
      element: <h2>{ROOT_$}</h2>,
    },
    {
      path: "/flat/*",
      element: <h2>{FLAT_$}</h2>,
    },
    {
      path: "/nested",
      element: (
        <div>
          <h2>{PARENT}</h2>
          <Outlet />
        </div>
      ),
      children: [
        {
          index: true,
          element: <h2>{NESTED_INDEX}</h2>,
        },
        {
          path: "*",
          element: <h2>{NESTED_$}</h2>,
        },
      ],
    },
    {
      path: "/parentless/*",
      element: <h2>{PARENTLESS_$}</h2>,
    },
  ]);

  test("flat exact match", async () => {
    render(<RemixStub initialEntries={["/flat"]} />);
    expect(await screen.findByText(FLAT_$)).toBeInTheDocument();
  });

  test("flat deep match", async () => {
    render(<RemixStub initialEntries={["/flat/swig"]} />);
    expect(await screen.findByText(FLAT_$)).toBeInTheDocument();
  });

  test("prioritizes index over root splat", async () => {
    render(<RemixStub />);
    expect(await screen.findByText(ROOT_INDEX)).toBeInTheDocument();
  });

  test("matches root splat", async () => {
    render(<RemixStub initialEntries={["/twisted/sugar"]} />);
    expect(await screen.findByText(ROOT_$)).toBeInTheDocument();
  });

  test("prioritizes index over splat for parent route match", async () => {
    render(<RemixStub initialEntries={["/nested"]} />);
    expect(await screen.findByText(NESTED_INDEX)).toBeInTheDocument();
  });

  test("nested child", async () => {
    render(<RemixStub initialEntries={["/nested/sodalicious"]} />);
    expect(await screen.findByText(NESTED_$)).toBeInTheDocument();
  });

  test("parentless exact match", async () => {
    render(<RemixStub initialEntries={["/parentless"]} />);
    expect(await screen.findByText(PARENTLESS_$)).toBeInTheDocument();
  });

  test("parentless deep match", async () => {
    render(<RemixStub initialEntries={["/parentless/chip"]} />);
    expect(await screen.findByText(PARENTLESS_$)).toBeInTheDocument();
  });
});
