import * as React from "react";
import { unstable_createRemixStub as createRemixStub } from "@remix-run/testing";
import {
  Outlet,
  Scripts,
  useLoaderData,
  useMatches,
  Link,
} from "@remix-run/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let ROOT_BOUNDARY_TEXT = "ROOT_TEXT" as const;
let ROOT_BOUNDARY_DATA_ID = "root-boundary-data" as const;
let ROOT_BOUNDARY_ID = "root-boundary" as const;
let ROOT_DATA_ID = "root-data" as const;

let LAYOUT_BOUNDARY_TEXT = "LAYOUT_BOUNDARY_TEXT" as const;
let LAYOUT_BOUNDARY_ID = "layout-boundary" as const;
let LAYOUT_BOUNDARY_DATA_ID = "layout-boundary-data" as const;
let LAYOUT_DATA_ID = "layout-data" as const;

let OWN_BOUNDARY_TEXT = "OWN_BOUNDARY_TEXT" as const;
let OWN_BOUNDARY_ID = "own-boundary" as const;

let NO_BOUNDARY_LOADER = "/no/loader" as const;
let HAS_BOUNDARY_LAYOUT_NESTED_LOADER = "/yes/loader-layout-boundary" as const;
let HAS_BOUNDARY_NESTED_LOADER = "/yes/loader-self-boundary" as const;

let ROOT_DATA = "root data" as const;
let LAYOUT_DATA = "layout data" as const;

function Root() {
  let data = useLoaderData();

  return (
    <>
      <div data-testid={ROOT_DATA_ID}>{data}</div>
      <Outlet />
      <Scripts />
    </>
  );
}

function RootCatchBoundary() {
  let matches = useMatches();
  let match = matches.find((m) => m.id === "root");

  return (
    <>
      <div data-testid={ROOT_BOUNDARY_ID}>{ROOT_BOUNDARY_TEXT}</div>
      <div data-testid={ROOT_BOUNDARY_DATA_ID}>{match?.data}</div>
      <Scripts />
    </>
  );
}

function HAS_BOUNDARY_LAYOUT_NESTED_LOADER_ERROR_ELEMENT() {
  let matches = useMatches();
  let match = matches.find(
    (m) => m.id === `routes${HAS_BOUNDARY_LAYOUT_NESTED_LOADER}`
  );
  return (
    <div>
      <div data-testid={LAYOUT_BOUNDARY_ID}>{LAYOUT_BOUNDARY_TEXT}</div>
      <div data-testid={LAYOUT_BOUNDARY_DATA_ID}>{match?.data}</div>
    </div>
  );
}

function HAS_BOUNDARY_NESTED_LOADER_ELEMENT() {
  let data = useLoaderData();

  return (
    <div>
      <div data-testid={LAYOUT_DATA_ID}>{data}</div>
      <Outlet />
    </div>
  );
}

let RemixStub = createRemixStub([
  {
    path: "/",
    element: <Root />,
    errorElement: <RootCatchBoundary />,
    loader: () => ROOT_DATA,
    id: "root",
    children: [
      {
        path: "/",
        index: true,
        id: "routes/index",
        element: (
          <div>
            <Link to={NO_BOUNDARY_LOADER}>{NO_BOUNDARY_LOADER}</Link>
            <Link to={HAS_BOUNDARY_LAYOUT_NESTED_LOADER}>
              {HAS_BOUNDARY_LAYOUT_NESTED_LOADER}
            </Link>
            <Link to={HAS_BOUNDARY_NESTED_LOADER}>
              {HAS_BOUNDARY_NESTED_LOADER}
            </Link>
          </div>
        ),
      },
      {
        path: HAS_BOUNDARY_LAYOUT_NESTED_LOADER,
        element: <div />,
        id: `routes${HAS_BOUNDARY_LAYOUT_NESTED_LOADER}`,
        loader: () => LAYOUT_DATA,
        errorElement: <HAS_BOUNDARY_LAYOUT_NESTED_LOADER_ERROR_ELEMENT />,
        children: [
          {
            index: true,
            element: <div />,
            loader: () => {
              throw new Response("", { status: 401 });
            },
          },
        ],
      },
      {
        path: NO_BOUNDARY_LOADER,
        id: `routes${NO_BOUNDARY_LOADER}`,
        element: <div />,
        loader: () => {
          throw new Response("", { status: 401 });
        },
      },
      {
        path: HAS_BOUNDARY_NESTED_LOADER,
        id: `routes${HAS_BOUNDARY_NESTED_LOADER}`,
        loader: () => LAYOUT_DATA,
        element: <HAS_BOUNDARY_NESTED_LOADER_ELEMENT />,
        children: [
          {
            index: true,
            id: `routes${HAS_BOUNDARY_NESTED_LOADER}/index`,
            element: <div />,
            loader: () => {
              throw new Response("", { status: 401 });
            },
            errorElement: (
              <div data-testid={OWN_BOUNDARY_ID}>{OWN_BOUNDARY_TEXT}</div>
            ),
          },
        ],
      },
    ],
  },
]);

test("renders root boundary with data available", async () => {
  render(<RemixStub initialEntries={[NO_BOUNDARY_LOADER]} />);
  await waitFor(() =>
    expect(screen.getByTestId(ROOT_BOUNDARY_ID)).toHaveTextContent(
      ROOT_BOUNDARY_TEXT
    )
  );
  await waitFor(() =>
    expect(screen.getByTestId(ROOT_BOUNDARY_DATA_ID)).toHaveTextContent(
      ROOT_DATA
    )
  );
});

test("renders root boundary with data available on transition", async () => {
  render(<RemixStub />);
  await waitFor(() => screen.getByText(NO_BOUNDARY_LOADER));
  await userEvent.click(screen.getByText(NO_BOUNDARY_LOADER));

  await waitFor(() =>
    expect(screen.getByTestId(ROOT_BOUNDARY_ID)).toHaveTextContent(
      ROOT_BOUNDARY_TEXT
    )
  );
  await waitFor(() =>
    expect(screen.getByTestId(ROOT_BOUNDARY_DATA_ID)).toHaveTextContent(
      ROOT_DATA
    )
  );
});

test("renders layout boundary with data available", async () => {
  render(<RemixStub initialEntries={[HAS_BOUNDARY_LAYOUT_NESTED_LOADER]} />);
  await waitFor(() =>
    expect(screen.getByTestId(ROOT_DATA_ID)).toHaveTextContent(ROOT_DATA)
  );
  await waitFor(() =>
    expect(screen.getByTestId(LAYOUT_BOUNDARY_ID)).toHaveTextContent(
      LAYOUT_BOUNDARY_TEXT
    )
  );
  await waitFor(() =>
    expect(screen.getByTestId(LAYOUT_BOUNDARY_DATA_ID)).toHaveTextContent(
      LAYOUT_DATA
    )
  );
});

test("renders layout boundary with data available on transition", async () => {
  render(<RemixStub />);
  await waitFor(() => screen.getByText(HAS_BOUNDARY_LAYOUT_NESTED_LOADER));
  await userEvent.click(screen.getByText(HAS_BOUNDARY_LAYOUT_NESTED_LOADER));

  await waitFor(() =>
    expect(screen.getByTestId(ROOT_DATA_ID)).toHaveTextContent(ROOT_DATA)
  );
  await waitFor(() =>
    expect(screen.getByTestId(LAYOUT_BOUNDARY_ID)).toHaveTextContent(
      LAYOUT_BOUNDARY_TEXT
    )
  );
  await waitFor(() =>
    expect(screen.getByTestId(LAYOUT_BOUNDARY_DATA_ID)).toHaveTextContent(
      LAYOUT_DATA
    )
  );
});

test("renders self boundary with layout data available", async () => {
  render(<RemixStub initialEntries={[HAS_BOUNDARY_NESTED_LOADER]} />);

  await waitFor(() =>
    expect(screen.getByTestId(ROOT_DATA_ID)).toHaveTextContent(ROOT_DATA)
  );
  await waitFor(() =>
    expect(screen.getByTestId(LAYOUT_DATA_ID)).toHaveTextContent(LAYOUT_DATA)
  );
  await waitFor(() =>
    expect(screen.getByTestId(OWN_BOUNDARY_ID)).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    )
  );
});

test("renders self boundary with layout data available on transition", async () => {
  render(<RemixStub />);
  await waitFor(() => screen.getByText(HAS_BOUNDARY_NESTED_LOADER));
  await userEvent.click(screen.getByText(HAS_BOUNDARY_NESTED_LOADER));

  await waitFor(() =>
    expect(screen.getByTestId(ROOT_DATA_ID)).toHaveTextContent(ROOT_DATA)
  );
  await waitFor(() =>
    expect(screen.getByTestId(LAYOUT_DATA_ID)).toHaveTextContent(LAYOUT_DATA)
  );
  await waitFor(() =>
    expect(screen.getByTestId(OWN_BOUNDARY_ID)).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    )
  );
});
