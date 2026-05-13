interface InvalidUrlViewProps {
    urlArray: string[]
}

export default function InvalidUrlView(props: InvalidUrlViewProps) {
    const urlArray = props.urlArray
    return (
        <div className="state error">
            <p>本插件只在如下网站有效:</p>
            <ul className="url-list">
                {
                    urlArray.map((item, i) => {
                        const linkUrl = `https://${item}`
                        return <li key={i}>
                            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                                {item}
                            </a>
                        </li>
                    })
                }
            </ul>
        </div>
    )
}