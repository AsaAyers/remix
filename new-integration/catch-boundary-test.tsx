import * as React from "react";
import { unstable_createRemixStub as createRemixStub } from "@remix-run/testing";
import { json } from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  Link,
  Outlet,
  Scripts,
  useLoaderData,
  useMatches,
  useRouteError,
} from "@remix-run/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("CatchBoundary", () => {
  let ROOT_BOUNDARY_TEXT = "ROOT_TEXT" as const;
  let OWN_BOUNDARY_TEXT = "OWN_BOUNDARY_TEXT" as const;

  let HAS_BOUNDARY_LOADER = "/yes/loader" as const;
  let HAS_BOUNDARY_ACTION = "/yes/action" as const;
  let NO_BOUNDARY_ACTION = "/no/action" as const;
  let NO_BOUNDARY_LOADER = "/no/loader" as const;

  let NOT_FOUND_HREF = "/not/found" as const;

  function RootCatchBoundary() {
    let matches = useMatches();
    return (
      <html>
        <head />
        <body>
          <div data-testid="root-boundary">{ROOT_BOUNDARY_TEXT}</div>
          <pre data-testid="matches">{JSON.stringify(matches)}</pre>
          <Scripts />
        </body>
      </html>
    );
  }

  function HAS_BOUNDARY_LOADER_ERROR_ELEMENT() {
    let error = useRouteError();

    return (
      <>
        <div data-testid="boundary-loader">{OWN_BOUNDARY_TEXT}</div>
        <pre data-testid="status">
          {isRouteErrorResponse(error) ? error.status : ""}
        </pre>
      </>
    );
  }

  function ACTIONS_CHILD_CATCH_ERROR_ELEMENT() {
    let error = useRouteError();
    let caught = isRouteErrorResponse(error) ? error : undefined;

    return (
      <p data-testid="child-catch">
        {caught?.status} {caught?.data}
      </p>
    );
  }

  function ACTION_ELEMENT() {
    let data = useLoaderData();
    return (
      <div>
        <p data-testid="parent-data">{data}</p>
        <Outlet />
      </div>
    );
  }

  function CHILD_ACTION_ELEMENT() {
    let data = useLoaderData();
    return (
      <>
        <p data-testid="child-data">{data}</p>
        <Form method="post" reloadDocument={true}>
          <button type="submit" name="key" value="value">
            Submit
          </button>
        </Form>
      </>
    );
  }

  let RemixStub = createRemixStub([
    {
      path: "/",
      id: "root",
      loader: () => json({ data: "ROOT LOADER" }),
      errorElement: <RootCatchBoundary />,
      children: [
        {
          index: true,
          element: (
            <div>
              <Link to={NOT_FOUND_HREF} data-testid={NOT_FOUND_HREF}>
                {NOT_FOUND_HREF}
              </Link>

              <Form method="post">
                <button
                  formAction={HAS_BOUNDARY_ACTION}
                  data-testid={HAS_BOUNDARY_ACTION}
                  type="submit"
                >
                  {HAS_BOUNDARY_ACTION}
                </button>
                <button
                  formAction={NO_BOUNDARY_ACTION}
                  data-testid={NO_BOUNDARY_ACTION}
                  type="submit"
                >
                  {NO_BOUNDARY_ACTION}
                </button>
              </Form>

              <Link data-testid={HAS_BOUNDARY_LOADER} to={HAS_BOUNDARY_LOADER}>
                {HAS_BOUNDARY_LOADER}
              </Link>
              <Link
                data-testid={`${HAS_BOUNDARY_LOADER}/child`}
                to={`${HAS_BOUNDARY_LOADER}/child`}
              >
                {HAS_BOUNDARY_LOADER}/child
              </Link>
              <Link data-testid={NO_BOUNDARY_LOADER} to={NO_BOUNDARY_LOADER}>
                {NO_BOUNDARY_LOADER}
              </Link>
            </div>
          ),
        },
        {
          path: HAS_BOUNDARY_ACTION,
          action: () => {
            throw new Response("", { status: 401 });
          },
          errorElement: (
            <p data-testid="action-boundary">{OWN_BOUNDARY_TEXT}</p>
          ),
          element: (
            <Form method="post">
              <button
                type="submit"
                formAction={HAS_BOUNDARY_ACTION}
                data-testid={HAS_BOUNDARY_ACTION}
              >
                Go
              </button>
            </Form>
          ),
        },
        {
          path: NO_BOUNDARY_ACTION,
          action: () => {
            throw new Response("", { status: 401 });
          },
          element: (
            <Form method="post">
              <button
                type="submit"
                formAction={NO_BOUNDARY_ACTION}
                data-testid={NO_BOUNDARY_ACTION}
              >
                Go
              </button>
            </Form>
          ),
        },
        {
          path: HAS_BOUNDARY_LOADER,
          loader: () => {
            throw new Response("", { status: 401 });
          },
          errorElement: <HAS_BOUNDARY_LOADER_ERROR_ELEMENT />,
          element: <div />,
          children: [
            {
              path: `${HAS_BOUNDARY_LOADER}/child`,
              loader: () => {
                throw new Response("", { status: 404 });
              },
              element: <div />,
            },
          ],
        },
        {
          path: NO_BOUNDARY_LOADER,
          loader: () => {
            throw new Response("", { status: 401 });
          },
          element: <div />,
        },
        {
          path: "action",
          loader: () => "PARENT",
          element: <ACTION_ELEMENT />,
          children: [
            {
              path: "child-catch",
              loader: () => "CHILD",
              action: () => {
                throw new Response("Caught!", { status: 400 });
              },
              element: <CHILD_ACTION_ELEMENT />,
              errorElement: <ACTIONS_CHILD_CATCH_ERROR_ELEMENT />,
            },
          ],
        },
      ],
    },
  ]);

  test("non-matching urls on document requests", async () => {
    render(<RemixStub initialEntries={[NOT_FOUND_HREF]} />);
    await waitFor(() => screen.getByTestId("root-boundary"));
    expect(screen.getByTestId("root-boundary")).toHaveTextContent(
      ROOT_BOUNDARY_TEXT
    );
    // There should be no loader data on the root route
    let expected = JSON.stringify([{ id: "root", pathname: "", params: {} }]);
    expect(screen.getByTestId("matches")).toHaveTextContent(expected);
  });

  test("non-matching urls on client transitions", async () => {
    render(<RemixStub />);
    await waitFor(() => screen.getByTestId(NOT_FOUND_HREF));
    await userEvent.click(screen.getByTestId(NOT_FOUND_HREF));
    await waitFor(() => screen.getByTestId("root-boundary"));
    // Root loader data sticks around from previous load
    let expected = JSON.stringify([
      { id: "root", pathname: "", params: {}, data: { data: "ROOT LOADER" } },
    ]);
    expect(screen.getByTestId("matches")).toHaveTextContent(expected);
  });

  // test("own boundary, action, document request", async () => {
  //   let params = new URLSearchParams();
  //   let res = await fixture.postDocument(HAS_BOUNDARY_ACTION, params);
  //   expect(res.status).toBe(401);
  //   expect(await res.text()).toMatch(OWN_BOUNDARY_TEXT);
  // });

  test("own boundary, action, client transition from other route", async () => {
    render(<RemixStub />);
    await waitFor(() => screen.getByTestId(HAS_BOUNDARY_ACTION));
    await userEvent.click(screen.getByTestId(HAS_BOUNDARY_ACTION));
    await waitFor(() => screen.getByTestId("action-boundary"));
  });

  test("own boundary, action, client transition from itself", async () => {
    render(<RemixStub initialEntries={[HAS_BOUNDARY_ACTION]} />);
    await waitFor(() => screen.getByTestId(HAS_BOUNDARY_ACTION));
    await userEvent.click(screen.getByTestId(HAS_BOUNDARY_ACTION));
    await waitFor(() => screen.getByTestId("action-boundary"));
  });

  // test("bubbles to parent in action document requests", async () => {
  //   let params = new URLSearchParams();
  //   let res = await fixture.postDocument(NO_BOUNDARY_ACTION, params);
  //   expect(res.status).toBe(401);
  //   expect(await res.text()).toMatch(ROOT_BOUNDARY_TEXT);
  // });

  test("bubbles to parent in action script transitions from other routes", async () => {
    render(<RemixStub />);
    await waitFor(() => screen.getByTestId(NO_BOUNDARY_ACTION));
    await userEvent.click(screen.getByTestId(NO_BOUNDARY_ACTION));
    await waitFor(() => screen.getByTestId("root-boundary"));
  });

  test("bubbles to parent in action script transitions from self", async () => {
    render(<RemixStub initialEntries={[NO_BOUNDARY_ACTION]} />);
    await waitFor(() => screen.getByTestId(NO_BOUNDARY_ACTION));
    await userEvent.click(screen.getByTestId(NO_BOUNDARY_ACTION));
    await waitFor(() => screen.getByTestId("root-boundary"));
  });

  test("own boundary, loader, document request", async () => {
    render(<RemixStub initialEntries={[HAS_BOUNDARY_LOADER]} />);
    await waitFor(() => screen.getByTestId("boundary-loader"));
    expect(screen.getByTestId("boundary-loader")).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    );
  });

  test("own boundary, loader, client transition", async () => {
    render(<RemixStub />);
    await waitFor(() => screen.getByTestId(HAS_BOUNDARY_LOADER));
    await userEvent.click(screen.getByTestId(HAS_BOUNDARY_LOADER));
    await waitFor(() => screen.getByTestId("boundary-loader"));
    expect(screen.getByTestId("boundary-loader")).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    );
  });

  test("bubbles to parent in loader document requests", async () => {
    render(<RemixStub initialEntries={[NO_BOUNDARY_LOADER]} />);
    await waitFor(() => screen.getByTestId("root-boundary"));
    expect(screen.getByTestId("root-boundary")).toHaveTextContent(
      ROOT_BOUNDARY_TEXT
    );
  });

  test("bubbles to parent in loader transitions from other routes", async () => {
    render(<RemixStub />);
    await waitFor(() => screen.getByTestId(NO_BOUNDARY_LOADER));
    await userEvent.click(screen.getByTestId(NO_BOUNDARY_LOADER));
    await waitFor(() => screen.getByTestId("root-boundary"));
    expect(screen.getByTestId("root-boundary")).toHaveTextContent(
      ROOT_BOUNDARY_TEXT
    );
  });

  test("uses correct catch boundary on server action errors", async () => {
    render(<RemixStub initialEntries={[`/action/child-catch`]} />);
    await waitFor(() => screen.getByTestId("parent-data"));
    expect(screen.getByTestId("parent-data")).toHaveTextContent("PARENT");
    expect(screen.getByTestId("child-data")).toHaveTextContent("CHILD");
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() => screen.getByTestId("child-catch"));
    // Preserves parent loader data
    expect(screen.getByTestId("parent-data")).toHaveTextContent("PARENT");
    expect(screen.getByTestId("child-catch")).toHaveTextContent(`400 Caught!`);
  });

  test("prefers parent catch when child loader also bubbles, document request", async () => {
    render(<RemixStub initialEntries={[HAS_BOUNDARY_LOADER + "/child"]} />);
    await waitFor(() => screen.getByTestId("boundary-loader"));
    expect(screen.getByTestId("boundary-loader")).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    );
    expect(screen.getByTestId("status")).toHaveTextContent("401");
  });

  test("prefers parent catch when child loader also bubbles, client transition", async () => {
    render(<RemixStub />, { hydrate: true });
    await waitFor(() => screen.getByTestId(`${HAS_BOUNDARY_LOADER}/child`));
    await userEvent.click(screen.getByTestId(`${HAS_BOUNDARY_LOADER}/child`));
    await waitFor(() => screen.getByTestId("boundary-loader"));
    expect(screen.getByTestId("boundary-loader")).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    );
    expect(screen.getByTestId("status")).toHaveTextContent("401");
  });
});
