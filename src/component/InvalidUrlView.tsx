export default function InvalidUrlView() {
  return (
    <div className="state error">
      <p>This extension only works on:</p>
      <ul className="url-list">
        <li>https://www.yfsp.tv</li>
        <li>https://yfsp.tv</li>
        <li>https://www.iyf.tv</li>
        <li>https://iyf.tv</li>
      </ul>
    </div>
  )
}